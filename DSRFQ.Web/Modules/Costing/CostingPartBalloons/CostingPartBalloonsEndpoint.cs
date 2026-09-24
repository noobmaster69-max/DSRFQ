using Microsoft.AspNetCore.Mvc;
using Serenity.Data;
using Serenity.Services;
using Serenity.Web;
using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Globalization;
using System.Linq;
using MyRow = DSRFQ.Costing.CostingPartBalloonsRow;

namespace DSRFQ.Costing.Endpoints;

[Route("Services/Costing/CostingPartBalloons/[action]")]
[ConnectionKey(typeof(MyRow)), ServiceAuthorize(typeof(MyRow))]
public class CostingPartBalloonsEndpoint : ServiceEndpoint
{
    [HttpPost, AuthorizeCreate(typeof(MyRow))]
    public SaveResponse Create(IUnitOfWork uow, SaveRequest<MyRow> request,
        [FromServices] ICostingPartBalloonsSaveHandler handler) => handler.Create(uow, request);

    [HttpPost, AuthorizeUpdate(typeof(MyRow))]
    public SaveResponse Update(IUnitOfWork uow, SaveRequest<MyRow> request,
        [FromServices] ICostingPartBalloonsSaveHandler handler) => handler.Update(uow, request);

    [HttpPost, AuthorizeDelete(typeof(MyRow))]
    public DeleteResponse Delete(IUnitOfWork uow, DeleteRequest request,
        [FromServices] ICostingPartBalloonsDeleteHandler handler) => handler.Delete(uow, request);

    [HttpPost]
    public RetrieveResponse<MyRow> Retrieve(IDbConnection connection, RetrieveRequest request,
        [FromServices] ICostingPartBalloonsRetrieveHandler handler) => handler.Retrieve(connection, request);

    [HttpPost, AuthorizeList(typeof(MyRow))]
    public ListResponse<MyRow> List(IDbConnection connection, ListRequest request,
        [FromServices] ICostingPartBalloonsListHandler handler) => handler.List(connection, request);

    public class ViewLinksRequest : ServiceRequest
    {
        public int CostingPartId { get; set; }
    }

    public class ViewLink
    {
        public int Id { get; set; }
        public string Kind { get; set; }
        public string Letter { get; set; }
        public string Title { get; set; }
        public int PageNumber { get; set; }
        public decimal? LabelX1 { get; set; }
        public decimal? LabelY1 { get; set; }
        public decimal? LabelX2 { get; set; }
        public decimal? LabelY2 { get; set; }
        public decimal? ViewX1 { get; set; }
        public decimal? ViewY1 { get; set; }
        public decimal? ViewX2 { get; set; }
        public decimal? ViewY2 { get; set; }
        public int? MarkPageNumber { get; set; }
        public string MarksJson { get; set; }
        public decimal? LineX1 { get; set; }
        public decimal? LineY1 { get; set; }
        public decimal? LineX2 { get; set; }
        public decimal? LineY2 { get; set; }
    }

    public class ViewLinksResponse : ServiceResponse
    {
        public List<ViewLink> Links { get; set; }
    }

    /// <summary>
    /// The drawing's section and detail views with where each was cut from -
    /// see the ViewLinks migration. Written by the consumer, read-only here.
    /// </summary>
    /// <remarks>
    /// An empty list, not an error, when the table is not there yet: the editor
    /// works without links exactly as it did before them.
    /// </remarks>
    [HttpPost, AuthorizeList(typeof(MyRow))]
    public ViewLinksResponse ListViewLinks(IDbConnection connection, ViewLinksRequest request)
    {
        try
        {
            return new ViewLinksResponse
            {
                Links = connection.Query<ViewLink>(@"
                    SELECT Id, Kind, Letter, Title, PageNumber,
                           LabelX1, LabelY1, LabelX2, LabelY2, ViewX1, ViewY1, ViewX2, ViewY2,
                           MarkPageNumber, MarksJson, LineX1, LineY1, LineX2, LineY2
                    FROM dbo.CostingPartViewLinks
                    WHERE CostingPartID = @id
                    ORDER BY PageNumber, Id", new { id = request.CostingPartId }).ToList()
            };
        }
        catch (Exception)
        {
            return new ViewLinksResponse { Links = new List<ViewLink>() };
        }
    }

    public class CheckSheetExportRequest : ServiceRequest
    {
        public int CostingPartId { get; set; }
        /// <summary>CheckSheet, IP or FPLP - see CheckSheetExcelReport.Forms.</summary>
        public string Form { get; set; }
        public List<CheckSheetExcelReport.Item> Items { get; set; }
    }

    /// <summary>
    /// The check sheet in DSEFACTORY SMARTQC's Excel forms: Check Sheet
    /// (I-QA-003), IP (I-QA-001) or FPLP (I-QA-002). See CheckSheetExcelReport.
    /// </summary>
    /// <remarks>
    /// The lines come from the browser, exactly as the check sheet is showing
    /// them - unsaved balloon edits included - so the file matches the screen
    /// it was exported from. Only the header (drawing number, revision,
    /// material) is read here, from the part.
    ///
    /// AuthorizeList: it writes nothing, and only lists what the caller could
    /// already see.
    /// </remarks>
    [HttpPost, AuthorizeList(typeof(MyRow))]
    public FileContentResult ExportCheckSheet(IDbConnection connection, CheckSheetExportRequest request,
        [FromServices] Microsoft.AspNetCore.Hosting.IWebHostEnvironment env)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (!CheckSheetExcelReport.Forms.TryGetValue(request.Form ?? "CheckSheet", out var form))
            throw new ValidationError($"Unknown check sheet form '{request.Form}'.");

        var part = CostingPartsRow.Fields;
        var header = connection.TryFirst<CostingPartsRow>(q => q
            .Select(part.PartNumber, part.Revision, part.Material)
            .Where(part.Id == request.CostingPartId))
            ?? throw new ValidationError("The part could not be found.");

        var bytes = CheckSheetExcelReport.Build(
            Path.Combine(env.ContentRootPath, "App_Data", "QcTemplates"), form,
            request.Items ?? [], header.PartNumber ?? "", header.Revision ?? "", header.Material ?? "");

        string safe(string s) => string.Concat((s ?? "").Split(Path.GetInvalidFileNameChars()));
        var name = string.IsNullOrWhiteSpace(header.PartNumber) ? $"Part{request.CostingPartId}" : safe(header.PartNumber);
        return ExcelContentResult.Create(bytes,
            $"CheckSheet_{form.SheetName}_{name}_{DateTime.Now.ToString("yyyyMMdd_HHmmss", CultureInfo.InvariantCulture)}.xlsx");
    }

    /// <summary>
    /// The balloon list as a formatted .xlsx - one line per characteristic.
    /// </summary>
    /// <remarks>
    /// Ported from One Supply's standard Excel export; the formatting lives in
    /// BalloonExcelReport.
    ///
    /// HttpGet, unlike every other action here, because the browser has to be
    /// able to navigate to it: a POST returning a file cannot be opened with a
    /// plain link, and the alternative is fetching the whole workbook into
    /// memory just to re-offer it as a blob.
    ///
    /// Rows are read straight off the table rather than through the list
    /// handler because the ordering is the report: balloons come out in
    /// drawing order, page then number, and the number is nvarchar holding
    /// "5-1" as well as "5", so it cannot be sorted as text.
    /// </remarks>
    [HttpGet, AuthorizeList(typeof(MyRow))]
    public FileContentResult ExportExcel(IDbConnection connection, int costingPartId)
    {
        var b = MyRow.Fields;
        var part = CostingPartsRow.Fields;

        var header = connection.TryFirst<CostingPartsRow>(q => q
            .Select(part.PartNumber, part.Revision)
            .Where(part.Id == costingPartId));

        var rows = connection.List<MyRow>(q => q
            .SelectTableFields()
            .Select(b.FeatureSymbolName)
            .Select(b.FeatureSymbolSymbol)
            // Tombstones stay out: RemovedByUser marks a balloon the operator
            // deleted, kept only so a re-run cannot resurrect it. NULL counts
            // as not-removed, which is why this is not simply "= 0".
            .Where(b.CostingPartId == costingPartId &
                   b.IsActive == 1 &
                   (b.RemovedByUser.IsNull() | new Criteria(b.RemovedByUser) == 0)));

        // Sorted here rather than in SQL: BalloonNo is nvarchar and holds "5-1"
        // beside "5", so ORDER BY on it gives 1, 10, 11, 2 - and puts a child
        // nowhere near its parent.
        var lines = rows
            .OrderBy(r => r.PageNumber ?? 1)
            .ThenBy(r => ParentNumber(r.BalloonNo))
            .ThenBy(r => ChildNumber(r.BalloonNo))
            .Select(r => new BalloonExcelReport.Line
            {
                BalloonNo = r.BalloonNo,
                // One Supply's report prints the glyph here, not a name. Both
                // are carried: the report puts the glyph in its own narrow
                // column so it can be set in a face that draws it, and the
                // name beside it so the column still reads on a machine where
                // that face is missing.
                Glyph = r.FeatureSymbolSymbol,
                Characteristic = r.FeatureSymbolName,
                Symbol = r.Symbol,
                UpperTol = r.UpperTol,
                LowerTol = r.LowerTol,
                // Multiplier is null for the ordinary "one of these" case; the
                // consumer only writes it when the drawing says 2X or more.
                Quantity = r.Multiplier,
                PageNumber = r.PageNumber,
                Section = r.Section,
                IsNote = r.IsNote == true
            })
            .ToList();

        var partNumber = header?.PartNumber ?? costingPartId.ToString(CultureInfo.InvariantCulture);
        var bytes = BalloonExcelReport.Build(partNumber, header?.Revision, lines);

        return ExcelContentResult.Create(bytes,
            $"Balloons_{Sanitize(partNumber)}_" +
            DateTime.Now.ToString("yyyyMMdd_HHmmss", CultureInfo.InvariantCulture) + ".xlsx");
    }

    /// <summary>
    /// Recognise the text inside a rectangle the operator drew - Area (W) or
    /// Single (Q) recognition. Nothing is saved: the widget adds what comes
    /// back as ordinary unsaved balloons, so the operator can undo them.
    /// </summary>
    [HttpPost, AuthorizeCreate(typeof(MyRow))]
    public RecognizeRegionResponse RecognizeRegion(IDbConnection connection, RecognizeRegionRequest request,
        [FromServices] Microsoft.Extensions.Configuration.IConfiguration config,
        [FromServices] Microsoft.AspNetCore.Hosting.IWebHostEnvironment env)
        => BalloonRegionRecognizer.Recognize(connection, request, config, env.ContentRootPath);

    /// <summary>
    /// The "5" of "5-1" (or "5.1", "5/1" - the separator is a shop setting).
    /// int.MaxValue sorts an unparseable one last.
    /// </summary>
    private static int ParentNumber(string balloonNo)
    {
        var m = System.Text.RegularExpressions.Regex.Match((balloonNo ?? "").Trim(), @"^(\d+)");
        return m.Success && int.TryParse(m.Groups[1].Value, out var n) ? n : int.MaxValue;
    }

    /// <summary>The "1" of "5-1"; 0 for a parent, so it leads its own children.</summary>
    private static int ChildNumber(string balloonNo)
    {
        var m = System.Text.RegularExpressions.Regex.Match((balloonNo ?? "").Trim(), @"^\d+\D+(\d+)$");
        return m.Success && int.TryParse(m.Groups[1].Value, out var n) ? n : 0;
    }

    /// <summary>Part numbers carry slashes; a filename cannot.</summary>
    private static string Sanitize(string name)
    {
        var clean = new string((name ?? "").Select(
            c => System.IO.Path.GetInvalidFileNameChars().Contains(c) ? '_' : c).ToArray());
        return clean.Length > 60 ? clean[..60] : clean;
    }
}
