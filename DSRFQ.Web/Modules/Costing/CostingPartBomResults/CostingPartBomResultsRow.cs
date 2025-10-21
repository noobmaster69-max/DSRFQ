using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;

namespace DSRFQ.Costing;

[ConnectionKey("Default"), Module("Costing"), TableName("CostingPartBomResults")]
[DisplayName("Costing Part Bom Results"), InstanceName("Costing Part Bom Results")]
[ReadPermission("?")]
[ModifyPermission("?")]
[ServiceLookupPermission("?")]
[LookupScript("CostingPartBomResults",Permission = "?")]
public sealed class CostingPartBomResultsRow : LoggingRow<CostingPartBomResultsRow.RowFields>, IIdRow, INameRow
{
    const string jCostingPart = nameof(jCostingPart);

    [DisplayName("Id"), Column("ID"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Costing Part"), Column("CostingPartID"), NotNull, ForeignKey(typeof(CostingPartsRow)), LeftJoin(jCostingPart)]
    [TextualField(nameof(CostingPartPartNumber)), LookupEditor(typeof(CostingPartsRow), Async = true)]
    public int? CostingPartId { get => fields.CostingPartId[this]; set => fields.CostingPartId[this] = value; }

    [DisplayName("Part Number"), QuickSearch, NameProperty]
    public string PartNumber { get => fields.PartNumber[this]; set => fields.PartNumber[this] = value; }

    [DisplayName("Description")]
    public string Description { get => fields.Description[this]; set => fields.Description[this] = value; }

    [DisplayName("Quantity"), Size(20), Scale(4)]
    public decimal? Quantity { get => fields.Quantity[this]; set => fields.Quantity[this] = value; }

    [DisplayName("Internal Engineering Number")]
    public string InternalEngineeringNumber { get => fields.InternalEngineeringNumber[this]; set => fields.InternalEngineeringNumber[this] = value; }

    [DisplayName("Is Manual"), NotNull,BooleanEditor]
    public bool? IsManual { get => fields.IsManual[this]; set => fields.IsManual[this] = value; }

    
    [DisplayName("Costing Part Part Number"), Origin(jCostingPart, nameof(CostingPartsRow.PartNumber))]
    public string CostingPartPartNumber { get => fields.CostingPartPartNumber[this]; set => fields.CostingPartPartNumber[this] = value; }

    public class RowFields : LoggingRowFields
    {
        public Int32Field Id;
        public Int32Field CostingPartId;
        public StringField PartNumber;
        public StringField Description;
        public DecimalField Quantity;
        public StringField InternalEngineeringNumber;
        public BooleanField IsManual;
     

        public StringField CostingPartPartNumber;
    }
}