using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System.ComponentModel;

namespace DSRFQ.Costing;

/// <summary>
/// One page's corrected grid lines.
/// </summary>
/// <remarks>
/// See DefaultDB_20260908_1600_BalloonGrids for why this exists and why the
/// lines are JSON page-percentages rather than pixels.
///
/// Absence is meaningful: a page with no row has never been adjusted, and the
/// widget falls back to equal spacing across the sheet - the same assumption
/// recognition makes. So this table holds corrections, not state.
/// </remarks>
[ConnectionKey("Default"), Module("Costing"), TableName("CostingPartBalloonGrids")]
[DisplayName("Costing Part Balloon Grids"), InstanceName("Balloon Grid")]
[ReadPermission("?")]
[ModifyPermission("?")]
public sealed class CostingPartBalloonGridsRow : LoggingRow<CostingPartBalloonGridsRow.RowFields>, IIdRow
{
    [DisplayName("Id"), Column("ID"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Costing Part"), Column("CostingPartID"), NotNull,
     ForeignKey(typeof(CostingPartsRow))]
    public int? CostingPartId { get => fields.CostingPartId[this]; set => fields.CostingPartId[this] = value; }

    /// <summary>1-based, as everywhere else in the balloon tables.</summary>
    [DisplayName("Page Number"), NotNull]
    public int? PageNumber { get => fields.PageNumber[this]; set => fields.PageNumber[this] = value; }

    /// <summary>
    /// Vertical boundary lines, ascending, as a JSON array of page percentages.
    /// Includes both outer borders, so 8 columns means 9 values.
    /// </summary>
    [DisplayName("X Lines")]
    public string XLines { get => fields.XLines[this]; set => fields.XLines[this] = value; }

    /// <summary>Horizontal boundary lines, same convention.</summary>
    [DisplayName("Y Lines")]
    public string YLines { get => fields.YLines[this]; set => fields.YLines[this] = value; }

    /// <summary>The page view's rotation in degrees: 0, 90, 180 or 270.</summary>
    [DisplayName("Rotation")]
    public int? Rotation { get => fields.Rotation[this]; set => fields.Rotation[this] = value; }

    /// <summary>The drawing border the grid divides, page percent. Null = whole page.</summary>
    [DisplayName("Frame X1")]
    public decimal? FrameX1 { get => fields.FrameX1[this]; set => fields.FrameX1[this] = value; }

    [DisplayName("Frame Y1")]
    public decimal? FrameY1 { get => fields.FrameY1[this]; set => fields.FrameY1[this] = value; }

    [DisplayName("Frame X2")]
    public decimal? FrameX2 { get => fields.FrameX2[this]; set => fields.FrameX2[this] = value; }

    [DisplayName("Frame Y2")]
    public decimal? FrameY2 { get => fields.FrameY2[this]; set => fields.FrameY2[this] = value; }

    public class RowFields : LoggingRowFields
    {
        public Int32Field Id;
        public Int32Field CostingPartId;
        public Int32Field PageNumber;
        public StringField XLines;
        public StringField YLines;
        public Int32Field Rotation;
        public DecimalField FrameX1;
        public DecimalField FrameY1;
        public DecimalField FrameX2;
        public DecimalField FrameY2;
    }
}
