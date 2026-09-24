using Microsoft.AspNetCore.Mvc;
using RabbitMQ.Client;
using Serenity.Data;
using Serenity.Reporting;
using Serenity.Services;
using Serenity.Web;
using System;
using System.Data;
using System.Globalization;
using System.Linq;
using System.Text;
using MyRow = DSRFQ.Costing.CostingPartsRow;

namespace DSRFQ.Costing.Endpoints;

[Route("Services/Costing/CostingParts/[action]")]
[ConnectionKey(typeof(MyRow)), ServiceAuthorize(typeof(MyRow))]
public class CostingPartsEndpoint : ServiceEndpoint
{
    [HttpPost, AuthorizeCreate(typeof(MyRow))]
    public SaveResponse Create(IUnitOfWork uow, SaveRequest<MyRow> request,
        [FromServices] ICostingPartsSaveHandler handler)
    {
        return handler.Create(uow, request);
    }

    [HttpPost, AuthorizeUpdate(typeof(MyRow))]
    public SaveResponse Update(IUnitOfWork uow, SaveRequest<MyRow> request,
        [FromServices] ICostingPartsSaveHandler handler)
    {
        return handler.Update(uow, request);
    }
 
    [HttpPost, AuthorizeDelete(typeof(MyRow))]
    public DeleteResponse Delete(IUnitOfWork uow, DeleteRequest request,
        [FromServices] ICostingPartsDeleteHandler handler)
    {
        return handler.Delete(uow, request);
    }

    [HttpPost]
    public RetrieveResponse<MyRow> Retrieve(IDbConnection connection, RetrieveRequest request,
        [FromServices] ICostingPartsRetrieveHandler handler)
    {
        return handler.Retrieve(connection, request);
    }

    [HttpPost, AuthorizeList(typeof(MyRow))]
    public ListResponse<MyRow> List(IDbConnection connection, ListRequest request,
        [FromServices] ICostingPartsListHandler handler)
    {
        return handler.List(connection, request);
    }

    /// <summary>
    /// Puts one part back on the queue that drives a stage of the pipeline.
    /// </summary>
    /// <remarks>
    /// The grid buttons exist because a stage can end up needing another run for
    /// reasons the user can see and the system cannot: a service was down when
    /// the drawing was uploaded, a template was fixed afterwards, or the costing
    /// inputs were corrected by hand. Before this, re-running meant publishing to
    /// RabbitMQ by hand.
    ///
    /// Re-running clears that stage's previous output first. The consumer appends
    /// its results, so without this a second costing run leaves the part with two
    /// of every cost line and a total that is quietly double.
    /// </remarks>
    /// <remarks>
    /// Named Rerun, not RerunStage: a method sharing a name with the RerunStage
    /// enum hides the type inside this class, and every use of the enum below
    /// then resolves to the method.
    /// </remarks>
    [HttpPost, AuthorizeUpdate(typeof(MyRow))]
    public RerunStageResponse Rerun(IUnitOfWork uow, RerunStageRequest request)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));
        if (request.CostingPartId <= 0)
            throw new ArgumentOutOfRangeException(nameof(request.CostingPartId));

        var fld = MyRow.Fields;
        var part = uow.Connection.TryFirst<MyRow>(new Criteria(fld.Id) == request.CostingPartId)
            ?? throw new ValidationError("NotFound", "This costing part no longer exists.");

        var (queue, statusField, label) = request.Stage switch
        {
            RerunStage.Drawing => ("NewCostingParts", fld.DrawingConversionStatusId, "Drawing conversion + OCR"),
            RerunStage.Costing => ("Costing", fld.CostingStatusId, "Costing"),
            RerunStage.Ballooning => ("Ballooning", fld.BalloonStatusId, "Ballooning"),
            _ => throw new ValidationError("InvalidStage", "Unknown stage.")
        };

        // 2 is In Progress. Publishing again while a run is live gives two
        // consumers the same part and duplicates whatever they write.
        var current = statusField[part];
        if (!request.Force && current == InProgressStatusId)
        {
            throw new ValidationError("AlreadyRunning",
                $"{label} is already running for this part. Wait for it to finish, " +
                "or use Force to queue it anyway.");
        }

        // A part that is only waiting still reads as Pending, so the status
        // check above cannot see it. Without this, clicking Re-run twice while
        // the queue is busy would clear the previous output a second time for a
        // job that has not even started.
        if (!request.Force && IsQueued(uow.Connection, request.CostingPartId, queue))
        {
            throw new ValidationError("AlreadyQueued",
                $"{label} is already waiting in the queue for this part. " +
                "See Costing › Processing Queue, or use Force to queue it anyway.");
        }

        // Page is ballooning-only; the other stages have no per-page unit of
        // work, and honouring it there would clear a page's output for a run
        // that then rebuilds the whole document anyway.
        var page = request.Stage == RerunStage.Ballooning ? request.PageNumber : null;
        var skipDone = request.Stage == RerunStage.Ballooning && !page.HasValue && request.SkipDonePages;

        // Skipping done pages clears nothing: the pages it runs are empty and
        // the ones it skips must keep what they have.
        if (!skipDone)
            ClearPreviousOutput(uow, request.CostingPartId, request.Stage, page);

        // Back to Pending so the grid shows the change immediately; the consumer
        // moves it to In Progress within a second or two of picking it up.
        new SqlUpdate(fld.TableName)
            .Set(statusField, PendingStatusId)
            .Where(new Criteria(fld.Id) == request.CostingPartId)
            .Execute(uow.Connection);

        // The queue row first, so the Processing Queue page shows the job even
        // if RabbitMQ or the consumer is down -- which is exactly when someone
        // goes looking for it. The consumer reuses this row rather than adding
        // its own when the message reaches it.
        // The SAME body for both. The queue row is what the consumer actually
        // runs from - its own enqueue keeps whichever row it finds rather than
        // adding a second - so a row written without the page discards the
        // scope, and "This Page" cleared one page then rebuilt the document.
        var body = skipDone
            ? $"{{\"Id\":{request.CostingPartId},\"SkipDone\":true}}"
            : MessageBody(request.CostingPartId, page);
        CostingQueue.Enqueue(uow.Connection, request.CostingPartId, queue,
            payload: page.HasValue || skipDone ? body : null);

        Publish(queue, body);

        return new RerunStageResponse
        {
            Queue = queue,
            Message = (page.HasValue
                          ? $"{label} queued for page {page} of part {request.CostingPartId}. "
                          : $"{label} queued for part {request.CostingPartId}. ") +
                      "See Costing › Processing Queue for its place in line."
        };
    }

    private const int PendingStatusId = 1;
    private const int InProgressStatusId = 2;

    /// <summary>
    /// Re-prices the material line after the operator changes "Priced as".
    /// </summary>
    /// <remarks>
    /// Picking a material used to record MaterialID and nothing else, so the
    /// quote kept whatever material cost the pipeline had produced -- or none
    /// at all -- until somebody re-ran the whole costing. That is a slow round
    /// trip for a decision the operator has already made.
    ///
    /// Density is part of the choice, not just price: mass is volume x density,
    /// so switching aluminium for stainless changes the weight the part is
    /// quoted at as well as the rate. Both are recomputed here from the stored
    /// volumes, which is why this is a server-side action rather than an
    /// arithmetic shortcut in the browser.
    ///
    /// The machining lines are untouched. Hours come from the geometry, not
    /// from what the stock is made of, so nothing else on the quote moves.
    /// </remarks>
    [HttpPost, AuthorizeUpdate(typeof(MyRow))]
    public ApplyMaterialResponse ApplyMaterial(IUnitOfWork uow, ApplyMaterialRequest request)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));

        var part = uow.Connection.Query<PartVolumes>(
            "SELECT ID, GrossVolume, NetVolume FROM dbo.CostingParts " +
            "WHERE ID = @id AND IsActive = 1", new { id = request.CostingPartId })
            .FirstOrDefault()
            ?? throw new ValidationError("NotFound", "This part no longer exists.");

        // Clearing the picker is a legitimate choice -- a drawing that says
        // "SEE BOM" has no single material -- so it drops the line rather than
        // leaving the previous material priced against the new selection.
        if (request.MaterialId == null)
        {
            DeactivateMaterialLine(uow, part.ID);
            uow.Connection.Execute(
                "UPDATE dbo.CostingParts SET MaterialID = NULL, UpdateDate = GETDATE() " +
                "WHERE ID = @id", new { id = part.ID });

            return new ApplyMaterialResponse
            {
                PartTotal = PartTotal(uow, part.ID),
                Message = "Material cleared, so this quote has no material cost."
            };
        }

        var material = uow.Connection.Query<MaterialRow>(
            "SELECT m.ID, m.Code, m.Name, m.Density, " +
            "       c.UnitPrice, c.CurrencyID, c.WeightDimensionUnitID " +
            "FROM dbo.Materials m " +
            "LEFT JOIN dbo.MaterialRawMaterialCosts c " +
            "       ON c.MaterialID = m.ID AND c.IsActive = 1 " +
            "      AND (c.FromDate IS NULL OR c.FromDate <= GETDATE()) " +
            "      AND (c.ToDate IS NULL OR c.ToDate >= GETDATE()) " +
            "WHERE m.ID = @id AND m.IsActive = 1 " +
            // Newest price wins when a material has more than one open row.
            "ORDER BY c.FromDate DESC, c.ID DESC",
            new { id = request.MaterialId }).FirstOrDefault()
            ?? throw new ValidationError("NotFound", "This material no longer exists.");

        if (material.Density is null or <= 0)
            throw new ValidationError("NoDensity",
                $"{material.Name} has no density, so the part's weight cannot be " +
                "worked out. Set it on the Materials page first.");

        if (material.UnitPrice == null)
            throw new ValidationError("NoPrice",
                $"{material.Name} has no raw material cost, so it cannot be priced. " +
                "Add one under Material Raw Material Costs first.");

        // Volumes are mm3 and density is g/cm3, so convert: 1 cm3 = 1000 mm3
        // and 1 kg = 1000 g, and the two cancel to a straight /1,000,000.
        const decimal MmCubedPerKgFactor = 1_000_000m;
        var gross = Math.Round((part.GrossVolume ?? 0) * material.Density.Value / MmCubedPerKgFactor, 4);
        var net = Math.Round((part.NetVolume ?? 0) * material.Density.Value / MmCubedPerKgFactor, 4);

        // Stock is bought by the billet, not by what survives machining, so the
        // quote is on gross weight -- the same basis the pipeline uses.
        var total = Math.Round(gross * material.UnitPrice.Value, 2);

        uow.Connection.Execute(
            "UPDATE dbo.CostingParts SET MaterialID = @materialId, " +
            "    GrossWeight = @gross, NetWeight = @net, UpdateDate = GETDATE() " +
            "WHERE ID = @id",
            new { materialId = material.ID, gross, net, id = part.ID });

        // Replace rather than update in place: there may be no line yet (a part
        // the pipeline could not price), and there may be more than one from an
        // earlier run.
        DeactivateMaterialLine(uow, part.ID);
        uow.Connection.Execute(
            "INSERT INTO dbo.CostingPartCostingResults " +
            "  (CostingPartID, Name, Description, Quantity, DimensionUnitID, " +
            "   UnitPrice, CurrencyID, Total, IsTimeUnit, IsManual, " +
            "   InsertDate, InsertUserId, IsActive) " +
            "VALUES (@partId, 'Material Cost', @description, @quantity, @unitId, " +
            "   @unitPrice, @currencyId, @total, 1, 0, GETDATE(), @userId, 1)",
            new
            {
                partId = part.ID,
                description = material.Name ?? material.Code,
                quantity = gross,
                unitId = material.WeightDimensionUnitID,
                unitPrice = material.UnitPrice,
                currencyId = material.CurrencyID,
                total,
                userId = User.GetIdentifier() is string s && int.TryParse(s, out var uid) ? uid : 1
            });

        return new ApplyMaterialResponse
        {
            GrossWeight = gross,
            NetWeight = net,
            UnitPrice = material.UnitPrice,
            Total = total,
            PartTotal = PartTotal(uow, part.ID),
            Message = $"Priced as {material.Name}: {gross:0.##} kg at " +
                      $"{material.UnitPrice:0.##}/kg = {total:0.00}."
        };
    }

    private static void DeactivateMaterialLine(IUnitOfWork uow, int partId)
    {
        // IsManual = 0 only: a line an estimator typed in by hand is theirs.
        uow.Connection.Execute(
            "UPDATE dbo.CostingPartCostingResults SET IsActive = 0, " +
            "    DeleteDate = GETDATE() " +
            "WHERE CostingPartID = @partId AND Name = 'Material Cost' " +
            "  AND IsManual = 0 AND IsActive = 1",
            new { partId });
    }

    private static decimal? PartTotal(IUnitOfWork uow, int partId)
    {
        return uow.Connection.Query<decimal?>(
            "SELECT SUM(Total) FROM dbo.CostingPartCostingResults " +
            "WHERE CostingPartID = @partId AND IsActive = 1",
            new { partId }).FirstOrDefault();
    }

    private class PartVolumes
    {
        public int ID { get; set; }
        public decimal? GrossVolume { get; set; }
        public decimal? NetVolume { get; set; }
    }

    private class MaterialRow
    {
        public int ID { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public decimal? Density { get; set; }
        public decimal? UnitPrice { get; set; }
        public int? CurrencyID { get; set; }
        public int? WeightDimensionUnitID { get; set; }
    }

    /// <summary>
    /// Whether this part already has a job waiting or running in the lane the
    /// given queue feeds.
    /// </summary>
    private static bool IsQueued(IDbConnection connection, int partId, string queueName)
    {
        var lane = CostingQueue.LaneForQueue(queueName);
        if (lane == null)
            return false;

        return connection.Query<int>(
            "SELECT TOP 1 1 FROM dbo.CostingPartQueue " +
            "WHERE CostingPartID = @partId AND Lane = @lane AND IsActive = 1 " +
            "  AND Status IN ('queued', 'running')",
            new { partId, lane }).Any();
    }

    /// <summary>
    /// Soft-deletes what a previous run of this stage produced.
    /// </summary>
    /// <param name="pageNumber">
    /// When set, only that 1-based page's output is cleared. Ballooning only.
    /// </param>
    private static void ClearPreviousOutput(IUnitOfWork uow, int partId,
        RerunStage stage, int? pageNumber = null)
    {
        switch (stage)
        {
            case RerunStage.Costing:
                // Costing results only. Special processes used to be cleared
                // here too, which was the wrong stage in both directions: the
                // costing run never writes them back, so re-costing a part
                // silently threw its special processes away for good. They are
                // produced by the drawing stage -- see below.
                Deactivate(uow, "CostingPartCostingResults", partId);
                break;

            case RerunStage.Ballooning:
                // Only the balloons. Mask zones hang off the part, not off a
                // balloon, and they are the operator's input to this stage
                // rather than its output - the rectangles drawn over the title
                // block so recognition stops producing balloons nobody wants.
                // Clearing them would make the re-run reproduce exactly the
                // balloons the masks exist to suppress.
                //
                // With a page, only that page is cleared - the point of a
                // single-page run is that the other pages, including any hand
                // corrections on them, are left alone.
                if (pageNumber.HasValue)
                    uow.Connection.Execute(
                        "UPDATE dbo.CostingPartBalloons SET IsActive = 0, " +
                        "    DeleteDate = GETDATE() " +
                        "WHERE CostingPartID = @partId AND PageNumber = @page " +
                        "  AND IsActive = 1",
                        new { partId, page = pageNumber.Value });
                else
                    Deactivate(uow, "CostingPartBalloons", partId);
                break;

            case RerunStage.Drawing:
                // The CONVERTED page images (Original = 0) are replaced wholesale
                // by the next run; the recognised fields are overwritten in place,
                // and are deliberately left alone so a value typed by hand
                // survives a re-run that fails to read it.
                //
                // Original = 1 must NOT be cleared. Those are the as-uploaded
                // renders, written once when the drawing is first uploaded, and
                // nothing in the pipeline ever recreates them -- the consumer only
                // ever inserts Original = 0 (handlers.py:988 and :1259). Clearing
                // them was permanent, and it broke two things at once: the
                // workspace's "Original" sheet had nothing to show ("This document
                // has no page images yet"), and ballooning, which reads
                // Original = 1 (handlers.py:2844), found no pages and failed.
                // Parts 14 and 15 were left in exactly that state.
                uow.Connection.Execute(
                    "UPDATE i SET i.IsActive = 0 FROM dbo.CostingPartDocumentImages i " +
                    "INNER JOIN dbo.CostingPartDocuments d ON d.ID = i.CostingPartDocumentID " +
                    "WHERE d.CostingPartID = @partId AND i.IsActive = 1 AND i.Original = 0",
                    new { partId });

                // Special processes belong to this stage: the consumer reads
                // them off the drawing's notes in finalize_from_title_block.
                // Cleared here so a re-run cannot leave the previous run's
                // processes sitting alongside the new ones -- the consumer
                // replaces them itself, but only on the path where it finds
                // some, so a run that reads no notes used to leave the old
                // rows in place looking current.
                //
                // Machine-read rows only. Anything an estimator added by hand
                // is theirs and survives, same rule the consumer applies.
                DeactivateMachineRead(uow, "CostingPartSpecialProcessResults", partId);
                break;
        }
    }

    private static void Deactivate(IUnitOfWork uow, string table, int partId) =>
        uow.Connection.Execute(
            $"UPDATE dbo.{table} SET IsActive = 0 WHERE CostingPartID = @partId AND IsActive = 1",
            new { partId });

    /// <summary>
    /// Soft-deletes only the rows a pipeline run produced, leaving hand-added
    /// ones alone.
    /// </summary>
    /// <remarks>
    /// For tables carrying IsManual. A re-run replacing its own output is
    /// expected; a re-run deleting what somebody typed in is not.
    /// </remarks>
    private static void DeactivateMachineRead(IUnitOfWork uow, string table, int partId) =>
        uow.Connection.Execute(
            $"UPDATE dbo.{table} SET IsActive = 0, DeleteDate = GETDATE() " +
            "WHERE CostingPartID = @partId AND IsActive = 1 AND IsManual = 0",
            new { partId });

    /// <summary>
    /// Publishes the part id to a queue the RFQ consumer is listening on.
    /// </summary>
    /// <remarks>
    /// Default exchange with the queue name as the routing key, matching what the
    /// consumer's own tooling does. The named exchange used by /UploadDrawing is
    /// bound only to NewCostingParts, so it cannot reach Costing or Ballooning.
    ///
    /// The body is a bare JSON integer because every handler passes the decoded
    /// body straight through as the part id.
    /// </remarks>
    /// <summary>
    /// Publish a job to the consumer.
    /// </summary>
    /// <remarks>
    /// The body is the bare part id when the whole document is being run -
    /// which is what every consumer handler has always received - and a JSON
    /// object when it is restricted to one page. The consumer accepts either;
    /// keeping the bare form for the common case means no handler had to
    /// change for stages that do not take a page.
    /// </remarks>
    /// <summary>
    /// What the consumer is handed: the bare part id, or {"Id":n,"Page":p}.
    /// </summary>
    /// <remarks>
    /// One place, because it is written twice - once into the queue row and
    /// once into the RabbitMQ message - and the two must agree. They did not:
    /// the row carried no page, the message did, and the row is the one that
    /// won.
    /// </remarks>
    private static string MessageBody(int costingPartId, int? pageNumber) =>
        pageNumber.HasValue
            ? $"{{\"Id\":{costingPartId},\"Page\":{pageNumber.Value}}}"
            : costingPartId.ToString(CultureInfo.InvariantCulture);

    private static void Publish(string queue, string body)
    {
        // 127.0.0.1, not "localhost" - see RabbitMqConnection.
        var factory = DSRFQ.Modules.Common.General.RabbitMqConnection.Factory();
        using var connection = factory.CreateConnection();
        using var channel = connection.CreateModel();

        channel.QueueDeclare(queue: queue, durable: true, exclusive: false,
            autoDelete: false, arguments: null);

        var properties = channel.CreateBasicProperties();
        properties.DeliveryMode = 2;   // persist across a broker restart

        channel.BasicPublish(exchange: "", routingKey: queue,
            basicProperties: properties,
            body: Encoding.UTF8.GetBytes(body));
    }

    [HttpPost, AuthorizeList(typeof(MyRow))]
    public FileContentResult ListExcel(IDbConnection connection, ListRequest request,
        [FromServices] ICostingPartsListHandler handler,
        [FromServices] IExcelExporter exporter)
    {
        var data = List(connection, request, handler).Entities;
        var bytes = exporter.Export(data, typeof(Columns.CostingPartsColumns), request.ExportColumns);
        return ExcelContentResult.Create(bytes, "CostingPartsList_" +
            DateTime.Now.ToString("yyyyMMdd_HHmmss", CultureInfo.InvariantCulture) + ".xlsx");
    }
}