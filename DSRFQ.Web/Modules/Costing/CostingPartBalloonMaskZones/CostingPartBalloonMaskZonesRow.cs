using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;

namespace DSRFQ.Costing;

/// <summary>
/// A rectangle blanked out before auto-recognition runs — title blocks, revision
/// tables, anything that produces balloons nobody wants.
///
/// Mirrors DS_ERP's BallooningDrawingMaskZonesRow. Coordinates are percent of
/// page (0-100), same convention as CostingPartBalloonsRow.
/// </summary>
[ConnectionKey("Default"), Module("Costing"), TableName("CostingPartBalloonMaskZones")]
[DisplayName("Costing Part Balloon Mask Zones"), InstanceName("Mask Zone")]
[ReadPermission("?")]
[ModifyPermission("?")]
public sealed class CostingPartBalloonMaskZonesRow : LoggingRow<CostingPartBalloonMaskZonesRow.RowFields>, IIdRow
{
    [DisplayName("Id"), Column("ID"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Costing Part"), Column("CostingPartID"), NotNull,
     ForeignKey(typeof(CostingPartsRow))]
    public int? CostingPartId { get => fields.CostingPartId[this]; set => fields.CostingPartId[this] = value; }

    [DisplayName("Page Number")]
    public int? PageNumber { get => fields.PageNumber[this]; set => fields.PageNumber[this] = value; }

    [DisplayName("Mask X1"), NotNull]
    public decimal? MaskX1 { get => fields.MaskX1[this]; set => fields.MaskX1[this] = value; }

    [DisplayName("Mask Y1"), NotNull]
    public decimal? MaskY1 { get => fields.MaskY1[this]; set => fields.MaskY1[this] = value; }

    [DisplayName("Mask X2"), NotNull]
    public decimal? MaskX2 { get => fields.MaskX2[this]; set => fields.MaskX2[this] = value; }

    [DisplayName("Mask Y2"), NotNull]
    public decimal? MaskY2 { get => fields.MaskY2[this]; set => fields.MaskY2[this] = value; }

    public class RowFields : LoggingRowFields
    {
        public Int32Field Id;
        public Int32Field CostingPartId;
        public Int32Field PageNumber;
        public DecimalField MaskX1;
        public DecimalField MaskY1;
        public DecimalField MaskX2;
        public DecimalField MaskY2;
    }
}
