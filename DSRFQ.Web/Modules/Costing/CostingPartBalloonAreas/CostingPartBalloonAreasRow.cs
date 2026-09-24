using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;

namespace DSRFQ.Costing;

/// <summary>
/// An area drawn on a drawing that decides how the balloons inside it are
/// numbered.
/// </summary>
/// <remarks>
/// Renumber walks a page's areas by <see cref="OrderIndex"/>, orders each
/// area's balloons by that area's <see cref="SortMode"/>, and finishes with
/// whatever fell outside every area. A balloon belongs to the first area that
/// contains it, which is why areas are not allowed to overlap.
///
/// Coordinates are percent of page (0-100), the same convention as
/// CostingPartBalloonsRow and CostingPartBalloonMaskZonesRow, so an area stays
/// on its geometry at any zoom or render resolution.
/// </remarks>
[ConnectionKey("Default"), Module("Costing"), TableName("CostingPartBalloonAreas")]
[DisplayName("Costing Part Balloon Areas"), InstanceName("Balloon Area")]
[ReadPermission("?")]
[ModifyPermission("?")]
public sealed class CostingPartBalloonAreasRow : LoggingRow<CostingPartBalloonAreasRow.RowFields>, IIdRow
{
    [DisplayName("Id"), Column("ID"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Costing Part"), Column("CostingPartID"), NotNull,
     ForeignKey(typeof(CostingPartsRow))]
    public int? CostingPartId { get => fields.CostingPartId[this]; set => fields.CostingPartId[this] = value; }

    /// <summary>1-based, as everywhere else in the balloon tables.</summary>
    [DisplayName("Page Number"), NotNull]
    public int? PageNumber { get => fields.PageNumber[this]; set => fields.PageNumber[this] = value; }

    /// <summary>Which area is numbered first. 1-based and dense per page.</summary>
    [DisplayName("Order"), NotNull]
    public int? OrderIndex { get => fields.OrderIndex[this]; set => fields.OrderIndex[this] = value; }

    [DisplayName("Area X1"), NotNull]
    public decimal? AreaX1 { get => fields.AreaX1[this]; set => fields.AreaX1[this] = value; }

    [DisplayName("Area Y1"), NotNull]
    public decimal? AreaY1 { get => fields.AreaY1[this]; set => fields.AreaY1[this] = value; }

    [DisplayName("Area X2"), NotNull]
    public decimal? AreaX2 { get => fields.AreaX2[this]; set => fields.AreaX2[this] = value; }

    [DisplayName("Area Y2"), NotNull]
    public decimal? AreaY2 { get => fields.AreaY2[this]; set => fields.AreaY2[this] = value; }

    /// <summary>
    /// One of: partition, left_to_right, right_to_left, top_to_bottom,
    /// bottom_to_top, reading_order, clockwise, counterclockwise, polar_sweep.
    /// Text rather than an enum so adding a mode needs no migration and a
    /// retired one still loads.
    /// </summary>
    [DisplayName("Sort Mode"), Size(40), NotNull]
    public string SortMode { get => fields.SortMode[this]; set => fields.SortMode[this] = value; }

    /// <summary>Degrees clockwise from 12 o'clock; only polar_sweep uses it.</summary>
    [DisplayName("Start Angle"), NotNull]
    public int? StartAngle { get => fields.StartAngle[this]; set => fields.StartAngle[this] = value; }

    /// <summary>Null falls back to "Area {OrderIndex}" on the client.</summary>
    [DisplayName("Label"), Size(100)]
    public string Label { get => fields.Label[this]; set => fields.Label[this] = value; }

    public class RowFields : LoggingRowFields
    {
        public Int32Field Id;
        public Int32Field CostingPartId;
        public Int32Field PageNumber;
        public Int32Field OrderIndex;
        public DecimalField AreaX1;
        public DecimalField AreaY1;
        public DecimalField AreaX2;
        public DecimalField AreaY2;
        public StringField SortMode;
        public Int32Field StartAngle;
        public StringField Label;
    }
}
