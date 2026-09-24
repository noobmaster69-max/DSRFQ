using Serenity.ComponentModel;
using System;
using System.ComponentModel;

namespace DSRFQ.Costing.Columns;

/// <summary>
/// The file library as someone looking for a drawing reads it.
/// </summary>
/// <remarks>
/// Ordered by what identifies a file rather than by what the database stores
/// first: the picture and name, then the part it belongs to, then the metadata
/// people filter on, then what the pipeline got out of it.
///
/// SearchText is deliberately absent -- it is the quick-search index, not
/// something anyone should read.
/// </remarks>
[ColumnsScript("Costing.CostingPartFiles")]
[BasedOnRow(typeof(CostingPartFilesRow), CheckNames = true)]
public class CostingPartFilesColumns
{
    [Width(58), AlignCenter]
    public string PartPicture { get; set; }

    [DisplayName("File"), Width(250)]
    public string FileName { get; set; }

    [DisplayName("Type"), Width(60), AlignCenter]
    public int DocumentType { get; set; }

    [DisplayName("Part"), Width(60), AlignRight]
    public int CostingPartId { get; set; }

    [DisplayName("Part Number"), Width(130)]
    public string PartNumber { get; set; }

    [Width(60)]
    public string Revision { get; set; }

    [Width(210)]
    public string Description { get; set; }

    [Width(190)]
    public string Material { get; set; }

    [DisplayName("Customer"), Width(140)]
    public string CustomerName { get; set; }

    /// <summary>Rendered as L x W x H by the grid; the raw values are separate columns.</summary>
    [DisplayName("Size"), Width(140)]
    public decimal Length { get; set; }

    [DisplayName("Weight"), Width(90), AlignRight]
    public decimal GrossWeight { get; set; }

    [DisplayName("BOM"), Width(60), AlignRight]
    public int BomLineCount { get; set; }

    [DisplayName("Proc"), Width(60), AlignRight]
    public int SpecialProcessCount { get; set; }

    [DisplayName("Balloons"), Width(75), AlignRight]
    public int BalloonCount { get; set; }

    [DisplayName("Machine"), Width(170)]
    public string CostingMachineName { get; set; }

    [DisplayName("Dup"), Width(55), AlignRight]
    public int DuplicateCount { get; set; }

    [DateTimeFormatter(DisplayFormat = "yyyy-MM-dd HH:mm"), Width(130)]
    public DateTime UploadedAt { get; set; }
}
