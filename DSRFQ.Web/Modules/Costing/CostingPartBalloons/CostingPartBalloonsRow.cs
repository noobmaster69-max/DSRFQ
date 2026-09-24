using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;

namespace DSRFQ.Costing;

/// <summary>
/// One balloon on a costing part's drawing.
///
/// Mirrors DS_ERP's BallooningDrawingItemsRow so the annotation mapping in the
/// ported widget carries over unchanged. Coordinates are percent of page
/// (0-100), matching Rect in BallooningTypes.ts — not pixels, so a re-render at
/// a different resolution keeps balloons attached to their geometry.
/// </summary>
[ConnectionKey("Default"), Module("Costing"), TableName("CostingPartBalloons")]
[DisplayName("Costing Part Balloons"), InstanceName("Balloon")]
// Matches CostingPartsRow: "?" means any authenticated user. Kept identical so
// a user who can open the drawing can also balloon it.
[ReadPermission("?")]
[ModifyPermission("?")]
public sealed class CostingPartBalloonsRow : LoggingRow<CostingPartBalloonsRow.RowFields>, IIdRow, INameRow
{
    const string jCostingPart = nameof(jCostingPart);
    const string jFeatureSymbol = nameof(jFeatureSymbol);
    const string jInspectionTool = nameof(jInspectionTool);

    [DisplayName("Id"), Column("ID"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Costing Part"), Column("CostingPartID"), NotNull,
     ForeignKey(typeof(CostingPartsRow)), LeftJoin(jCostingPart)]
    public int? CostingPartId { get => fields.CostingPartId[this]; set => fields.CostingPartId[this] = value; }

    [DisplayName("Balloon No"), Size(20), NotNull, QuickSearch, NameProperty]
    public string BalloonNo { get => fields.BalloonNo[this]; set => fields.BalloonNo[this] = value; }

    [DisplayName("Page Number")]
    public int? PageNumber { get => fields.PageNumber[this]; set => fields.PageNumber[this] = value; }

    [DisplayName("Center X"), NotNull]
    public decimal? CenterX { get => fields.CenterX[this]; set => fields.CenterX[this] = value; }

    [DisplayName("Center Y"), NotNull]
    public decimal? CenterY { get => fields.CenterY[this]; set => fields.CenterY[this] = value; }

    [DisplayName("Balloon Color"), Size(100)]
    public string BalloonColor { get => fields.BalloonColor[this]; set => fields.BalloonColor[this] = value; }

    [DisplayName("Balloon Size")]
    public decimal? BalloonSize { get => fields.BalloonSize[this]; set => fields.BalloonSize[this] = value; }

    [DisplayName("B Box X1"), NotNull]
    public decimal? BBoxX1 { get => fields.BBoxX1[this]; set => fields.BBoxX1[this] = value; }

    [DisplayName("B Box Y1"), NotNull]
    public decimal? BBoxY1 { get => fields.BBoxY1[this]; set => fields.BBoxY1[this] = value; }

    [DisplayName("B Box X2"), NotNull]
    public decimal? BBoxX2 { get => fields.BBoxX2[this]; set => fields.BBoxX2[this] = value; }

    [DisplayName("B Box Y2"), NotNull]
    public decimal? BBoxY2 { get => fields.BBoxY2[this]; set => fields.BBoxY2[this] = value; }

    [DisplayName("Symbol")]
    public string Symbol { get => fields.Symbol[this]; set => fields.Symbol[this] = value; }

    [DisplayName("Original Symbol")]
    public string OriginalSymbol { get => fields.OriginalSymbol[this]; set => fields.OriginalSymbol[this] = value; }

    /// <summary>
    /// Which catalogued characteristic this balloon controls, matched from its
    /// text. Nullable, and that is a real answer: a plain untoleranced
    /// dimension or a general note controls nothing in the vocabulary, which is
    /// a different thing from "not yet classified".
    /// </summary>
    [DisplayName("Feature Symbol"), Column("FeatureSymbolID"),
     ForeignKey("MasterFeatureSymbols", "Id"), LeftJoin(jFeatureSymbol),
     TextualField(nameof(FeatureSymbolName))]
    [LookupEditor(typeof(Master.FeatureSymbolsRow), FilterField = "IsActive", FilterValue = "1")]
    public int? FeatureSymbolId { get => fields.FeatureSymbolId[this]; set => fields.FeatureSymbolId[this] = value; }

    [DisplayName("Feature Symbol"), Expression($"{jFeatureSymbol}.[Name]")]
    public string FeatureSymbolName { get => fields.FeatureSymbolName[this]; set => fields.FeatureSymbolName[this] = value; }

    /// <summary>
    /// The catalogued glyph itself - ⌖, ⏤ - as opposed to its name.
    /// </summary>
    /// <remarks>
    /// Both, because the Excel report needs both: One Supply's report prints
    /// the glyph, which is what an inspector matches against the drawing, and
    /// the name is what makes the column survive a machine whose fonts cannot
    /// draw it.
    /// </remarks>
    [DisplayName("Feature Glyph"), Expression($"{jFeatureSymbol}.[Symbol]")]
    public string FeatureSymbolSymbol { get => fields.FeatureSymbolSymbol[this]; set => fields.FeatureSymbolSymbol[this] = value; }

    [DisplayName("Upper Tol"), Size(100)]
    public string UpperTol { get => fields.UpperTol[this]; set => fields.UpperTol[this] = value; }

    [DisplayName("Lower Tol"), Size(100)]
    public string LowerTol { get => fields.LowerTol[this]; set => fields.LowerTol[this] = value; }

    /// <summary>
    /// What measures this characteristic. Nullable: most are measured with
    /// whatever is to hand, and a forced default would be a fact nobody stated.
    /// </summary>
    [DisplayName("Inspection Tool"), Column("InspectionToolID"),
     ForeignKey("MasterInspectionTools", "Id"), LeftJoin(jInspectionTool),
     TextualField(nameof(InspectionToolName))]
    [LookupEditor(typeof(Master.InspectionToolsRow), FilterField = "IsActive", FilterValue = "1")]
    public int? InspectionToolId { get => fields.InspectionToolId[this]; set => fields.InspectionToolId[this] = value; }

    [DisplayName("Inspection Tool"), Expression($"{jInspectionTool}.[Name]")]
    public string InspectionToolName { get => fields.InspectionToolName[this]; set => fields.InspectionToolName[this] = value; }

    /// <summary>
    /// Which general tolerance filled UpperTol/LowerTol in - ".XXX",
    /// "ISO 2768-1 m". NULL means the tolerance was printed on the drawing, so
    /// nothing may overwrite it.
    /// </summary>
    [DisplayName("Tolerance Standard"), Size(60)]
    public string ToleranceStandard { get => fields.ToleranceStandard[this]; set => fields.ToleranceStandard[this] = value; }

    [DisplayName("Multiplier"), Size(100)]
    public string Multiplier { get => fields.Multiplier[this]; set => fields.Multiplier[this] = value; }

    [DisplayName("Section"), Size(100)]
    public string Section { get => fields.Section[this]; set => fields.Section[this] = value; }

    [DisplayName("Grid Start"), Size(50)]
    public string GridStart { get => fields.GridStart[this]; set => fields.GridStart[this] = value; }

    [DisplayName("Grid End"), Size(50)]
    public string GridEnd { get => fields.GridEnd[this]; set => fields.GridEnd[this] = value; }

    [DisplayName("Is Note")]
    public bool? IsNote { get => fields.IsNote[this]; set => fields.IsNote[this] = value; }

    /// <summary>
    /// A datum FEATURE - the surface others are measured from, not something
    /// measured. Distinct from a datum reference inside a control frame.
    /// </summary>
    [DisplayName("Is Datum")]
    public bool? IsDatum { get => fields.IsDatum[this]; set => fields.IsDatum[this] = value; }

    [DisplayName("Manual")]
    public bool? Manual { get => fields.Manual[this]; set => fields.Manual[this] = value; }

    /// <summary>
    /// Soft delete. Balloons the user removed are kept so a re-run of
    /// recognition does not resurrect them.
    /// </summary>
    [DisplayName("Removed By User")]
    public bool? RemovedByUser { get => fields.RemovedByUser[this]; set => fields.RemovedByUser[this] = value; }

    // ── One Supply's per-balloon state. See DefaultDB_20260915_1000. ──────

    [DisplayName("Audited"), NotNull]
    public bool? Audited { get => fields.Audited[this]; set => fields.Audited[this] = value; }

    [DisplayName("Audited On")]
    public DateTime? AuditedOn { get => fields.AuditedOn[this]; set => fields.AuditedOn[this] = value; }

    [DisplayName("Audited By"), Size(100)]
    public string AuditedBy { get => fields.AuditedBy[this]; set => fields.AuditedBy[this] = value; }

    [DisplayName("Balloon Shape"), Size(20)]
    public string BalloonShape { get => fields.BalloonShape[this]; set => fields.BalloonShape[this] = value; }

    [DisplayName("Balloon Line Width")]
    public int? BalloonLineWidth { get => fields.BalloonLineWidth[this]; set => fields.BalloonLineWidth[this] = value; }

    [DisplayName("Balloon Style"), Size(20)]
    public string BalloonStyle { get => fields.BalloonStyle[this]; set => fields.BalloonStyle[this] = value; }

    [DisplayName("Text Color"), Size(20)]
    public string TextColor { get => fields.TextColor[this]; set => fields.TextColor[this] = value; }

    [DisplayName("Show Arrow")]
    public bool? ShowArrow { get => fields.ShowArrow[this]; set => fields.ShowArrow[this] = value; }

    [DisplayName("Balloon Scale")]
    public decimal? BalloonScale { get => fields.BalloonScale[this]; set => fields.BalloonScale[this] = value; }

    [DisplayName("Box Hidden"), NotNull]
    public bool? BoxHidden { get => fields.BoxHidden[this]; set => fields.BoxHidden[this] = value; }

    /// <summary>"theoretical" (basic) or "reference"; null is an ordinary dimension.</summary>
    [DisplayName("Dimension Feature"), Size(20)]
    public string DimensionFeature { get => fields.DimensionFeature[this]; set => fields.DimensionFeature[this] = value; }

    [DisplayName("Number Category"), Size(40)]
    public string NumberCategory { get => fields.NumberCategory[this]; set => fields.NumberCategory[this] = value; }

    [DisplayName("Export Mode"), Size(20)]
    public string ExportMode { get => fields.ExportMode[this]; set => fields.ExportMode[this] = value; }

    [DisplayName("Crop Rotation")]
    public int? CropRotation { get => fields.CropRotation[this]; set => fields.CropRotation[this] = value; }

    [DisplayName("Costing Part Part Number"), Origin(jCostingPart, nameof(CostingPartsRow.PartNumber))]
    public string CostingPartPartNumber { get => fields.CostingPartPartNumber[this]; set => fields.CostingPartPartNumber[this] = value; }

    public class RowFields : LoggingRowFields
    {
        public Int32Field Id;
        public Int32Field CostingPartId;
        public StringField BalloonNo;
        public Int32Field PageNumber;
        public DecimalField CenterX;
        public DecimalField CenterY;
        public StringField BalloonColor;
        public DecimalField BalloonSize;
        public DecimalField BBoxX1;
        public DecimalField BBoxY1;
        public DecimalField BBoxX2;
        public DecimalField BBoxY2;
        public StringField Symbol;
        public StringField OriginalSymbol;
        public Int32Field FeatureSymbolId;
        public StringField FeatureSymbolName;
        public StringField FeatureSymbolSymbol;
        public StringField UpperTol;
        public StringField LowerTol;
        public Int32Field InspectionToolId;
        public StringField InspectionToolName;
        public StringField ToleranceStandard;
        public StringField Multiplier;
        public StringField Section;
        public StringField GridStart;
        public StringField GridEnd;
        public BooleanField IsNote;
        public BooleanField IsDatum;
        public BooleanField Manual;
        public BooleanField RemovedByUser;
        public BooleanField Audited;
        public DateTimeField AuditedOn;
        public StringField AuditedBy;
        public StringField BalloonShape;
        public Int32Field BalloonLineWidth;
        public StringField BalloonStyle;
        public StringField TextColor;
        public BooleanField ShowArrow;
        public DecimalField BalloonScale;
        public BooleanField BoxHidden;
        public StringField DimensionFeature;
        public StringField NumberCategory;
        public StringField ExportMode;
        public Int32Field CropRotation;
        public StringField CostingPartPartNumber;
    }
}
