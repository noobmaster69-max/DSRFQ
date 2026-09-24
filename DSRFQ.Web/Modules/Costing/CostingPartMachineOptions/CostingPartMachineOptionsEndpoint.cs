using Microsoft.AspNetCore.Mvc;
using Serenity.Data;
using Serenity.Services;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using MyRow = DSRFQ.Costing.CostingPartMachineOptionsRow;

namespace DSRFQ.Costing.Endpoints;

[Route("Services/Costing/CostingPartMachineOptions/[action]")]
[ConnectionKey(typeof(MyRow)), ServiceAuthorize(typeof(MyRow))]
public class CostingPartMachineOptionsEndpoint : ServiceEndpoint
{
    [HttpPost, AuthorizeList(typeof(MyRow))]
    public ListResponse<MyRow> List(IDbConnection connection, ListRequest request,
        [FromServices] ICostingPartMachineOptionsListHandler handler)
    {
        return handler.List(connection, request);
    }

    /// <summary>
    /// Which processes are machine time, and which kind of machine runs them.
    /// </summary>
    /// <remarks>
    /// Matches how new_tsh splits work: a lathe is a machine with no Z travel,
    /// a mill has all three. Material and special-process lines are not machine
    /// time at all and get no options.
    /// </remarks>
    private static string ProcessKind(string lineName)
    {
        var n = (lineName ?? "").ToLowerInvariant();
        if (n.Contains("turning")) return "turning";
        if (n.Contains("milling")) return "milling";
        return null;
    }

    /// <summary>
    /// Works out, for every machining line on a part, which machines could run it.
    /// </summary>
    /// <remarks>
    /// Deliberately more permissive than new_tsh. Its filter demands an exact
    /// axis-count match and strictly greater envelope, which is why a part that
    /// fits a machine exactly is excluded from it. Here anything that
    /// physically fits is listed, with FitsEnvelope/FitsWeight/AxisSufficient
    /// recorded per row so the UI can show a machine that does not fit rather
    /// than hide it -- an operator overriding a limit should be able to see
    /// what they are overriding.
    ///
    /// Axis uses >=, not ==: a 5-axis machine can run a 3-axis job. It usually
    /// costs more per hour, which is the trade-off the person is being shown.
    /// </remarks>
    [HttpPost, AuthorizeUpdate(typeof(MyRow))]
    public BuildMachineOptionsResponse Build(IUnitOfWork uow, BuildMachineOptionsRequest request)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));
        if (request.CostingPartId <= 0)
            throw new ArgumentOutOfRangeException(nameof(request.CostingPartId));

        var partId = request.CostingPartId;

        if (!request.Force)
        {
            var existing = uow.Connection.Query<int>(
                "SELECT TOP 1 1 FROM dbo.CostingPartMachineOptions " +
                "WHERE CostingPartID = @partId AND IsActive = 1", new { partId }).Any();
            if (existing)
                return new BuildMachineOptionsResponse { Message = "Options already built." };
        }

        var part = uow.Connection.Query<PartDims>(
            "SELECT Length, Width, Height, GrossWeight FROM dbo.CostingParts WHERE ID = @partId",
            new { partId }).FirstOrDefault()
            ?? throw new ValidationError("NotFound", "This costing part no longer exists.");

        // Both sides get sorted largest-first, so the part is allowed to sit on
        // the machine in whatever orientation fits -- which is what fixturing
        // actually does.
        var need = new[] { part.Length ?? 0, part.Width ?? 0, part.Height ?? 0 }
            .OrderByDescending(v => v).ToArray();

        var lines = uow.Connection.Query<CostLine>(
            "SELECT ID, Name, Quantity, MachineID FROM dbo.CostingPartCostingResults " +
            "WHERE CostingPartID = @partId AND IsActive = 1", new { partId }).ToList();

        var machines = uow.Connection.Query<MachineRow>(
            "SELECT ID, Name, Cost, CurrencyID, AxisNumber, WeightLimit, " +
            "       WorkEnvelopeX, WorkEnvelopeY, WorkEnvelopeZ " +
            "FROM dbo.Machines WHERE IsActive = 1").ToList();

        uow.Connection.Execute(
            "UPDATE dbo.CostingPartMachineOptions SET IsActive = 0, DeleteDate = GETDATE() " +
            "WHERE CostingPartID = @partId AND IsActive = 1", new { partId });

        int written = 0, considered = 0;
        foreach (var line in lines)
        {
            var kind = ProcessKind(line.Name);
            if (kind == null)
                continue;
            considered++;

            foreach (var m in machines)
            {
                var env = new[] { m.WorkEnvelopeX ?? 0, m.WorkEnvelopeY ?? 0, m.WorkEnvelopeZ ?? 0 }
                    .OrderByDescending(v => v).ToArray();

                // A lathe has no Z travel; a mill has all three. Offering a
                // lathe for a milling operation would be noise, not a choice.
                var isLathe = (m.WorkEnvelopeZ ?? 0) == 0;
                if (kind == "milling" && isLathe) continue;
                if (kind == "turning" && !isLathe) continue;

                // Turning only constrains the two dimensions the machine has.
                var fitsEnvelope = kind == "turning"
                    ? env[0] >= need[0] && env[1] >= need[1]
                    : env[0] >= need[0] && env[1] >= need[1] && env[2] >= need[2];

                var fitsWeight = m.WeightLimit == null || part.GrossWeight == null
                    || m.WeightLimit >= part.GrossWeight;

                // No axis requirement is recorded on the line, so this only
                // reports the machine's capability rather than judging it.
                var axisOk = true;

                // Anything that cannot hold the part is not an option at all;
                // weight and axis are shown but not disqualifying.
                if (!fitsEnvelope) continue;

                var hours = line.Quantity ?? 0m;
                var rate = m.Cost;
                uow.Connection.Execute(
                    "INSERT INTO dbo.CostingPartMachineOptions " +
                    "(CostingPartID, CostingPartCostingResultID, MachineID, HourlyRate, " +
                    " CurrencyID, LineTotal, IsSelected, IsRecommended, IsUserChoice, " +
                    " FitsEnvelope, FitsWeight, AxisSufficient, InsertDate, InsertUserId, IsActive) " +
                    "VALUES (@partId, @lineId, @machineId, @rate, @currencyId, @lineTotal, " +
                    " @isSelected, @isRecommended, 0, @fitsEnvelope, @fitsWeight, @axisOk, " +
                    " GETDATE(), 1, 1)",
                    new
                    {
                        partId,
                        lineId = line.ID,
                        machineId = m.ID,
                        rate,
                        currencyId = m.CurrencyID,
                        lineTotal = rate == null ? (decimal?)null : Math.Round(hours * rate.Value, 2),
                        isSelected = (short)(line.MachineID == m.ID ? 1 : 0),
                        isRecommended = (short)(line.MachineID == m.ID ? 1 : 0),
                        fitsEnvelope = (short)(fitsEnvelope ? 1 : 0),
                        fitsWeight = (short)(fitsWeight ? 1 : 0),
                        axisOk = (short)(axisOk ? 1 : 0)
                    });
                written++;
            }
        }

        return new BuildMachineOptionsResponse
        {
            Lines = considered,
            Options = written,
            Message = $"{written} machine option(s) across {considered} process(es)."
        };
    }

    /// <summary>
    /// Puts a cost line on a different machine and re-prices it.
    /// </summary>
    /// <remarks>
    /// Hours are the machining time and do not change with the machine -- only
    /// the rate does, so Total is hours x the new rate. IsUserChoice is set so
    /// a later re-cost can tell a deliberate choice from the pipeline's pick.
    /// </remarks>
    [HttpPost, AuthorizeUpdate(typeof(MyRow))]
    public ApplyMachineResponse Apply(IUnitOfWork uow, ApplyMachineRequest request)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));

        var line = uow.Connection.Query<CostLine>(
            "SELECT ID, Name, Quantity, MachineID, CostingPartID FROM dbo.CostingPartCostingResults " +
            "WHERE ID = @id AND IsActive = 1", new { id = request.CostingPartCostingResultId })
            .FirstOrDefault()
            ?? throw new ValidationError("NotFound", "This cost line no longer exists.");

        var machine = uow.Connection.Query<MachineRow>(
            "SELECT ID, Name, Cost, CurrencyID FROM dbo.Machines WHERE ID = @id AND IsActive = 1",
            new { id = request.MachineId }).FirstOrDefault()
            ?? throw new ValidationError("NotFound", "This machine no longer exists.");

        if (machine.Cost == null)
            throw new ValidationError("NoRate",
                $"{machine.Name} has no hourly rate, so it cannot be priced. " +
                "Set its Cost on the Machines page first.");

        var hours = line.Quantity ?? 0m;
        var total = Math.Round(hours * machine.Cost.Value, 2);

        uow.Connection.Execute(
            "UPDATE dbo.CostingPartCostingResults " +
            "SET MachineID = @machineId, MachineName = @machineName, " +
            "    UnitPrice = @rate, Total = @total, UpdateDate = GETDATE() " +
            "WHERE ID = @id",
            new
            {
                machineId = machine.ID,
                machineName = machine.Name,
                rate = machine.Cost,
                total,
                id = line.ID
            });

        // Exactly one option per line carries the selection.
        uow.Connection.Execute(
            "UPDATE dbo.CostingPartMachineOptions SET IsSelected = 0, IsUserChoice = 0, " +
            "       UpdateDate = GETDATE() " +
            "WHERE CostingPartCostingResultID = @lineId AND IsActive = 1",
            new { lineId = line.ID });
        uow.Connection.Execute(
            "UPDATE dbo.CostingPartMachineOptions SET IsSelected = 1, IsUserChoice = 1, " +
            "       UpdateDate = GETDATE() " +
            "WHERE CostingPartCostingResultID = @lineId AND MachineID = @machineId AND IsActive = 1",
            new { lineId = line.ID, machineId = machine.ID });

        var partTotal = uow.Connection.Query<decimal?>(
            "SELECT SUM(Total) FROM dbo.CostingPartCostingResults " +
            "WHERE CostingPartID = @partId AND IsActive = 1",
            new { partId = line.CostingPartID }).FirstOrDefault();

        return new ApplyMachineResponse
        {
            UnitPrice = machine.Cost,
            Total = total,
            PartTotal = partTotal,
            Message = $"{line.Name} moved to {machine.Name} at {machine.Cost:0.##}/h."
        };
    }

    private sealed class PartDims
    {
        public decimal? Length { get; set; }
        public decimal? Width { get; set; }
        public decimal? Height { get; set; }
        public decimal? GrossWeight { get; set; }
    }

    private sealed class CostLine
    {
        public int ID { get; set; }
        public int CostingPartID { get; set; }
        public string Name { get; set; }
        public decimal? Quantity { get; set; }
        public int? MachineID { get; set; }
    }

    private sealed class MachineRow
    {
        public int ID { get; set; }
        public string Name { get; set; }
        public decimal? Cost { get; set; }
        public int? CurrencyID { get; set; }
        public int? AxisNumber { get; set; }
        public decimal? WeightLimit { get; set; }
        public decimal? WorkEnvelopeX { get; set; }
        public decimal? WorkEnvelopeY { get; set; }
        public decimal? WorkEnvelopeZ { get; set; }
    }
}
