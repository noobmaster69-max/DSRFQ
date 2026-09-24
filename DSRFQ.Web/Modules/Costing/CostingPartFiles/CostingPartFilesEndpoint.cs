using Microsoft.AspNetCore.Mvc;
using Serenity.Data;
using Serenity.Reporting;
using Serenity.Services;
using Serenity.Web;
using System;
using System.Collections.Generic;
using System.Data;
using System.Globalization;
using System.Linq;
using MyRow = DSRFQ.Costing.CostingPartFilesRow;

namespace DSRFQ.Costing.Endpoints;

[Route("Services/Costing/CostingPartFiles/[action]")]
[ConnectionKey(typeof(MyRow)), ServiceAuthorize(typeof(MyRow))]
public class CostingPartFilesEndpoint : ServiceEndpoint
{
    [HttpPost, AuthorizeList(typeof(MyRow))]
    public ListResponse<MyRow> List(IDbConnection connection, ListRequest request,
        [FromServices] ICostingPartFilesListHandler handler)
    {
        return handler.List(connection, request);
    }

    [HttpPost, AuthorizeList(typeof(MyRow))]
    public FileContentResult ListExcel(IDbConnection connection, ListRequest request,
        [FromServices] ICostingPartFilesListHandler handler,
        [FromServices] IExcelExporter exporter)
    {
        var data = List(connection, request, handler).Entities;
        var bytes = exporter.Export(data, typeof(Columns.CostingPartFilesColumns), request.ExportColumns);
        return ExcelContentResult.Create(bytes, "FileLibrary_" +
            DateTime.Now.ToString("yyyyMMdd_HHmmss", CultureInfo.InvariantCulture) + ".xlsx");
    }

    /// <summary>
    /// The child-table detail behind one file, for the expanded row.
    /// </summary>
    /// <remarks>
    /// Loaded on demand rather than joined into the list: a part can have 400
    /// balloons and 40 BOM lines, and nobody wants that in every row of a
    /// search result. The list carries only the counts; this fills in the
    /// detail for the one file someone opened.
    /// </remarks>
    [HttpPost, AuthorizeList(typeof(MyRow))]
    public FileDetailResponse Detail(IDbConnection connection, FileDetailRequest request)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));
        if (request.CostingPartId <= 0)
            throw new ArgumentOutOfRangeException(nameof(request.CostingPartId));

        var partId = request.CostingPartId;

        var bom = connection.Query<BomLine>(
            "SELECT PartNumber, Description, Quantity, InternalEngineeringNumber " +
            "FROM dbo.CostingPartBomResults WHERE CostingPartID = @partId AND IsActive = 1 " +
            "ORDER BY ID", new { partId }).ToList();

        var processes = connection.Query<string>(
            "SELECT SpecialProcessName FROM dbo.CostingPartSpecialProcessResults " +
            "WHERE CostingPartID = @partId AND IsActive = 1 ORDER BY ID",
            new { partId }).ToList();

        var costing = connection.Query<CostLine>(
            "SELECT Name, Quantity, UnitPrice, Total, MachineName " +
            "FROM dbo.CostingPartCostingResults WHERE CostingPartID = @partId AND IsActive = 1 " +
            "ORDER BY ID", new { partId }).ToList();

        // Other uploads of the same file, so a duplicate can be reached rather
        // than merely counted.
        var duplicates = connection.Query<DuplicateFile>(
            "SELECT d2.CostingPartID, d2.FileName, d2.InsertDate " +
            "FROM dbo.CostingPartDocuments d1 " +
            "INNER JOIN dbo.CostingPartDocuments d2 ON d2.FileName = d1.FileName " +
            " AND d2.ID <> d1.ID AND d2.IsActive = 1 " +
            "WHERE d1.ID = @docId AND d1.IsActive = 1 " +
            "ORDER BY d2.CostingPartID", new { docId = request.DocumentId }).ToList();

        return new FileDetailResponse
        {
            Bom = bom, SpecialProcesses = processes,
            Costing = costing, Duplicates = duplicates
        };
    }

    public class FileDetailRequest : ServiceRequest
    {
        public int CostingPartId { get; set; }
        public int DocumentId { get; set; }
    }

    public class FileDetailResponse : ServiceResponse
    {
        public List<BomLine> Bom { get; set; }
        public List<string> SpecialProcesses { get; set; }
        public List<CostLine> Costing { get; set; }
        public List<DuplicateFile> Duplicates { get; set; }
    }

    public class BomLine
    {
        public string PartNumber { get; set; }
        public string Description { get; set; }
        public decimal? Quantity { get; set; }
        public string InternalEngineeringNumber { get; set; }
    }

    public class CostLine
    {
        public string Name { get; set; }
        public decimal? Quantity { get; set; }
        public decimal? UnitPrice { get; set; }
        public decimal? Total { get; set; }
        public string MachineName { get; set; }
    }

    public class DuplicateFile
    {
        public int CostingPartID { get; set; }
        public string FileName { get; set; }
        public DateTime? InsertDate { get; set; }
    }
}
