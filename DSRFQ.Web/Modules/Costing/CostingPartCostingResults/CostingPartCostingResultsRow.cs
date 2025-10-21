using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;

namespace DSRFQ.Costing;

[ConnectionKey("Default"), Module("Costing"), TableName("CostingPartCostingResults")]
[DisplayName("Costing Part Costing Results"), InstanceName("Costing Part Costing Results")]
[ReadPermission("?")]
[ModifyPermission("?")]
[ServiceLookupPermission("?")]
[LookupScript("CostingPartCostingResults",Permission = "?")]
public sealed class CostingPartCostingResultsRow : LoggingRow<CostingPartCostingResultsRow.RowFields>, IIdRow, INameRow
{
    const string jCostingPart = nameof(jCostingPart);
    const string jDimensionUnit = nameof(jDimensionUnit);
    const string jCurrency = nameof(jCurrency);

    [DisplayName("Id"), Column("ID"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Costing Part"), Column("CostingPartID"), NotNull, ForeignKey(typeof(CostingPartsRow)), LeftJoin(jCostingPart)]
    [TextualField(nameof(CostingPartPartNumber)), LookupEditor(typeof(CostingPartsRow), Async = true)]
    public int? CostingPartId { get => fields.CostingPartId[this]; set => fields.CostingPartId[this] = value; }

    [DisplayName("Costing Category Id"), Column("CostingCategoryID")]
    public int? CostingCategoryId { get => fields.CostingCategoryId[this]; set => fields.CostingCategoryId[this] = value; }

    [DisplayName("Name"), QuickSearch, NameProperty]
    public string Name { get => fields.Name[this]; set => fields.Name[this] = value; }

    [DisplayName("Description")]
    public string Description { get => fields.Description[this]; set => fields.Description[this] = value; }

    [DisplayName("Quantity"), Size(20), Scale(4)]
    public decimal? Quantity { get => fields.Quantity[this]; set => fields.Quantity[this] = value; }

    [DisplayName("Dimension Unit"), Column("DimensionUnitID"), ForeignKey(typeof(Master.DimensionUnitsRow)), LeftJoin(jDimensionUnit)]
    [TextualField(nameof(DimensionUnitCode)), LookupEditor(typeof(Master.DimensionUnitsRow), Async = true)]
    public int? DimensionUnitId { get => fields.DimensionUnitId[this]; set => fields.DimensionUnitId[this] = value; }

    [DisplayName("Dimension Unit"), Size(100)]
    public string DimensionUnit { get => fields.DimensionUnit[this]; set => fields.DimensionUnit[this] = value; }

    [DisplayName("Unit Price"), Size(20), Scale(4)]
    public decimal? UnitPrice { get => fields.UnitPrice[this]; set => fields.UnitPrice[this] = value; }

    [DisplayName("Currency"), Column("CurrencyID"), NotNull, ForeignKey(typeof(Master.CurrenciesRow)), LeftJoin(jCurrency)]
    [TextualField(nameof(CurrencyCode)), LookupEditor(typeof(Master.CurrenciesRow), Async = true)]
    public int? CurrencyId { get => fields.CurrencyId[this]; set => fields.CurrencyId[this] = value; }

    [DisplayName("Total"), Size(20), Scale(4)]
    public decimal? Total { get => fields.Total[this]; set => fields.Total[this] = value; }

    [DisplayName("Is Time Unit"), NotNull,BooleanEditor]
    public bool? IsTimeUnit { get => fields.IsTimeUnit[this]; set => fields.IsTimeUnit[this] = value; }

    [DisplayName("Is Manual"), NotNull,BooleanEditor]
    public bool? IsManual { get => fields.IsManual[this]; set => fields.IsManual[this] = value; }

   

    [DisplayName("Costing Part Part Number"), Origin(jCostingPart, nameof(CostingPartsRow.PartNumber))]
    public string CostingPartPartNumber { get => fields.CostingPartPartNumber[this]; set => fields.CostingPartPartNumber[this] = value; }

    [DisplayName("Dimension Unit Code"), Origin(jDimensionUnit, nameof(Master.DimensionUnitsRow.Code))]
    public string DimensionUnitCode { get => fields.DimensionUnitCode[this]; set => fields.DimensionUnitCode[this] = value; }

    [DisplayName("Currency Code"), Origin(jCurrency, nameof(Master.CurrenciesRow.Code)),LookupInclude]
    public string CurrencyCode { get => fields.CurrencyCode[this]; set => fields.CurrencyCode[this] = value; }

    public class RowFields : LoggingRowFields
    {
        public Int32Field Id;
        public Int32Field CostingPartId;
        public Int32Field CostingCategoryId;
        public StringField Name;
        public StringField Description;
        public DecimalField Quantity;
        public Int32Field DimensionUnitId;
        public StringField DimensionUnit;
        public DecimalField UnitPrice;
        public Int32Field CurrencyId;
        public DecimalField Total;
        public BooleanField IsTimeUnit;
        public BooleanField IsManual;
        

        public StringField CostingPartPartNumber;
        public StringField DimensionUnitCode;
        public StringField CurrencyCode;
    }
}