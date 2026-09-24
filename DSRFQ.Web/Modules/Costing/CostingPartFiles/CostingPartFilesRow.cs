using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;

namespace DSRFQ.Costing;

/// <summary>
/// One uploaded file, with everything the pipeline has learned about it.
/// </summary>
/// <remarks>
/// Backed by the dbo.CostingPartFiles view, which is read-only by design: every
/// column already lives on CostingPartDocuments, CostingParts or one of the
/// results tables, and a second writable copy would go stale the moment someone
/// edited a part in the workspace.
///
/// This exists because the Drawing Library lists PARTS. Finding "the drawing
/// with the silver-plating spec", or whichever file had 0250-32053 in its BOM,
/// meant opening parts one at a time.
/// </remarks>
[ConnectionKey("Default"), Module("Costing"), TableName("CostingPartFiles")]
[DisplayName("File Library"), InstanceName("File")]
[ReadPermission("?")]
public sealed class CostingPartFilesRow : Row<CostingPartFilesRow.RowFields>, IIdRow, INameRow
{
    [DisplayName("Id"), Column("ID"), IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Part"), Column("CostingPartID")]
    public int? CostingPartId { get => fields.CostingPartId[this]; set => fields.CostingPartId[this] = value; }

    /// <summary>CostingPartDocuments.Type: 1 = 2D, 2 = 3D, 3 = CAD.</summary>
    [DisplayName("Type"), Column("DocumentType")]
    public int? DocumentType { get => fields.DocumentType[this]; set => fields.DocumentType[this] = value; }

    [DisplayName("File Name"), NameProperty]
    public string FileName { get => fields.FileName[this]; set => fields.FileName[this] = value; }

    [DisplayName("File Directory")]
    public string FileDirectory { get => fields.FileDirectory[this]; set => fields.FileDirectory[this] = value; }

    [DisplayName("Converted File")]
    public string ConvertedFileDirectory { get => fields.ConvertedFileDirectory[this]; set => fields.ConvertedFileDirectory[this] = value; }

    [DisplayName("Uploaded")]
    public DateTime? UploadedAt { get => fields.UploadedAt[this]; set => fields.UploadedAt[this] = value; }

    [DisplayName("Part Number")]
    public string PartNumber { get => fields.PartNumber[this]; set => fields.PartNumber[this] = value; }

    [DisplayName("Revision")]
    public string Revision { get => fields.Revision[this]; set => fields.Revision[this] = value; }

    [DisplayName("Description")]
    public string Description { get => fields.Description[this]; set => fields.Description[this] = value; }

    [DisplayName("Material")]
    public string Material { get => fields.Material[this]; set => fields.Material[this] = value; }

    [DisplayName("Material Id"), Column("MaterialID")]
    public int? MaterialId { get => fields.MaterialId[this]; set => fields.MaterialId[this] = value; }

    [DisplayName("Customer")]
    public string CustomerName { get => fields.CustomerName[this]; set => fields.CustomerName[this] = value; }

    [DisplayName("UOM")]
    public string Uom { get => fields.Uom[this]; set => fields.Uom[this] = value; }

    [DisplayName("Part Picture")]
    public string PartPicture { get => fields.PartPicture[this]; set => fields.PartPicture[this] = value; }

    [DisplayName("Machine")]
    public string CostingMachineName { get => fields.CostingMachineName[this]; set => fields.CostingMachineName[this] = value; }

    [DisplayName("Length"), Size(20), Scale(4)]
    public decimal? Length { get => fields.Length[this]; set => fields.Length[this] = value; }
    [DisplayName("Width"), Size(20), Scale(4)]
    public decimal? Width { get => fields.Width[this]; set => fields.Width[this] = value; }
    [DisplayName("Height"), Size(20), Scale(4)]
    public decimal? Height { get => fields.Height[this]; set => fields.Height[this] = value; }
    [DisplayName("Gross Weight"), Size(20), Scale(4)]
    public decimal? GrossWeight { get => fields.GrossWeight[this]; set => fields.GrossWeight[this] = value; }
    [DisplayName("Net Weight"), Size(20), Scale(4)]
    public decimal? NetWeight { get => fields.NetWeight[this]; set => fields.NetWeight[this] = value; }
    [DisplayName("Faces")]
    public int? NumberOfFace { get => fields.NumberOfFace[this]; set => fields.NumberOfFace[this] = value; }
    [DisplayName("Holes")]
    public int? NumberOfHole { get => fields.NumberOfHole[this]; set => fields.NumberOfHole[this] = value; }

    [DisplayName("Conversion Status"), Column("DrawingConversionStatusID")]
    public int? DrawingConversionStatusId { get => fields.DrawingConversionStatusId[this]; set => fields.DrawingConversionStatusId[this] = value; }
    [DisplayName("OCR Status"), Column("OcrStatusID")]
    public int? OcrStatusId { get => fields.OcrStatusId[this]; set => fields.OcrStatusId[this] = value; }
    [DisplayName("Costing Status"), Column("CostingStatusID")]
    public int? CostingStatusId { get => fields.CostingStatusId[this]; set => fields.CostingStatusId[this] = value; }
    [DisplayName("Balloon Status"), Column("BalloonStatusID")]
    public int? BalloonStatusId { get => fields.BalloonStatusId[this]; set => fields.BalloonStatusId[this] = value; }

    // What the pipeline extracted -- the columns that answer "is this file
    // worth opening".
    [DisplayName("BOM Lines")]
    public int? BomLineCount { get => fields.BomLineCount[this]; set => fields.BomLineCount[this] = value; }
    [DisplayName("Processes")]
    public int? SpecialProcessCount { get => fields.SpecialProcessCount[this]; set => fields.SpecialProcessCount[this] = value; }
    [DisplayName("Balloons")]
    public int? BalloonCount { get => fields.BalloonCount[this]; set => fields.BalloonCount[this] = value; }
    [DisplayName("Costing Total"), Size(20), Scale(4)]
    public decimal? CostingTotal { get => fields.CostingTotal[this]; set => fields.CostingTotal[this] = value; }

    /// <summary>Other active documents sharing this file name.</summary>
    [DisplayName("Duplicates")]
    public int? DuplicateCount { get => fields.DuplicateCount[this]; set => fields.DuplicateCount[this] = value; }

    /// <summary>
    /// Everything searchable in one column, including BOM part numbers and
    /// special-process names.
    /// </summary>
    /// <remarks>
    /// QuickSearch targets this alone. Listing the individual columns instead
    /// would miss the child tables entirely, and those carry what people
    /// actually search for -- a BOM line's part number, a plating spec.
    /// Not in the columns script: it is an index, not something to read.
    /// </remarks>
    [DisplayName("Search Text"), QuickSearch]
    public string SearchText { get => fields.SearchText[this]; set => fields.SearchText[this] = value; }

    public class RowFields : RowFieldsBase
    {
        public Int32Field Id;
        public Int32Field CostingPartId;
        public Int32Field DocumentType;
        public StringField FileName;
        public StringField FileDirectory;
        public StringField ConvertedFileDirectory;
        public DateTimeField UploadedAt;
        public StringField PartNumber;
        public StringField Revision;
        public StringField Description;
        public StringField Material;
        public Int32Field MaterialId;
        public StringField CustomerName;
        public StringField Uom;
        public StringField PartPicture;
        public StringField CostingMachineName;
        public DecimalField Length;
        public DecimalField Width;
        public DecimalField Height;
        public DecimalField GrossWeight;
        public DecimalField NetWeight;
        public Int32Field NumberOfFace;
        public Int32Field NumberOfHole;
        public Int32Field DrawingConversionStatusId;
        public Int32Field OcrStatusId;
        public Int32Field CostingStatusId;
        public Int32Field BalloonStatusId;
        public Int32Field BomLineCount;
        public Int32Field SpecialProcessCount;
        public Int32Field BalloonCount;
        public DecimalField CostingTotal;
        public Int32Field DuplicateCount;
        public StringField SearchText;
    }
}
