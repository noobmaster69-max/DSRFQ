using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;
using DSRFQ.Company;
using DSRFQ.Master;
using DSRFQ.Modules.Common.Permissions;
using DSRFQ.Web.Modules;

namespace DSRFQ.Material;

[ConnectionKey("Default"), Module("Material"), TableName("MaterialRawMaterialCosts")]
[DisplayName("Raw Material Costs"), InstanceName("Raw Material Costs")]
[ReadPermission("?")]
[InsertPermission("?")]
[UpdatePermission("?")]
[DeletePermission("?")]
[NavigationPermission(MasterPermissionKeys.MasterMaterialNavigation)]

[ServiceLookupPermission("?")]
[LookupScript("MaterialRawMaterialCosts",Permission = "?",LookupType = typeof(MultiCompanyRowLookupScript<>))]

public sealed class RawMaterialCostsRow : LoggingRow<RawMaterialCostsRow.RowFields>, IIdRow,IMultiCompanyRow
{
    const string jMaterial = nameof(jMaterial);
    const string jMaterialTemper = nameof(jMaterialTemper);

    const string jWeightDimensionUnit = nameof(jWeightDimensionUnit);
    const string jCurrency = nameof(jCurrency);
    const string jCompany = nameof(jCompany);
    const string jGroup = nameof(jGroup);
    [DisplayName("Id"), Column("ID"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Material"), Column("MaterialID"), ForeignKey(typeof(MaterialsRow)), LeftJoin(jMaterial)]
    [TextualField(nameof(MaterialCode)), LookupEditor(typeof(MaterialsRow), Async = true)]
    public int? MaterialId { get => fields.MaterialId[this]; set => fields.MaterialId[this] = value; }

    [DisplayName("Material Temper Id"), Column("MaterialTemperID")]
    public int? MaterialTemperId { get => fields.MaterialTemperId[this]; set => fields.MaterialTemperId[this] = value; }

    
    [LookupEditor(typeof(WeightUnitsRow))]
    [DisplayName("Weight Dimension Unit"), Column("WeightDimensionUnitID"), NotNull, ForeignKey("MasterWeightUnits", "ID")]
    [LeftJoin(jWeightDimensionUnit), TextualField(nameof(WeightDimensionUnitCode))]
    public int? WeightDimensionUnitId { get => fields.WeightDimensionUnitId[this]; set => fields.WeightDimensionUnitId[this] = value; }
    
    
    [LookupEditor(typeof(CurrenciesRow))]
    [DisplayName("Currency"), Column("CurrencyID"), NotNull,ForeignKey("MasterCurrencies", "ID")]
    [LeftJoin(jCurrency), TextualField(nameof(CurrencyCode))]
    public int? CurrencyId { get => fields.CurrencyId[this]; set => fields.CurrencyId[this] = value; }

    [DisplayName("Unit Price"), Size(20), Scale(4), NotNull]
    public decimal? UnitPrice { get => fields.UnitPrice[this]; set => fields.UnitPrice[this] = value; }

    [DisplayName("From Date")]
    public DateTime? FromDate { get => fields.FromDate[this]; set => fields.FromDate[this] = value; }

    [DisplayName("To Date")]
    public DateTime? ToDate { get => fields.ToDate[this]; set => fields.ToDate[this] = value; }

   
    [DisplayName("Material Code"), Origin(jMaterial, nameof(MaterialsRow.Code))]
    public string MaterialCode { get => fields.MaterialCode[this]; set => fields.MaterialCode[this] = value; }

    [DisplayName("Weight Dimension Unit Code"), Expression($"{jWeightDimensionUnit}.[Code]")]
    public string WeightDimensionUnitCode { get => fields.WeightDimensionUnitCode[this]; set => fields.WeightDimensionUnitCode[this] = value; }
    [DisplayName("Currency Code"), Expression($"{jCurrency}.[Code]")]
    public string CurrencyCode { get => fields.CurrencyCode[this]; set => fields.CurrencyCode[this] = value; }

    [DisplayName("Material Shape"), Column("MaterialShapeID")]
    public int? MaterialShapeId
    {
        get => fields.MaterialShapeId[this];
        set => fields.MaterialShapeId[this] = value;
    }
    [LookupEditor(typeof(CompaniesRow),FilterField = "IsActive",FilterValue = "1")]
    [ReadPermission(Administration.PermissionKeys.Company)]
    [DisplayName("Company"), Column("CompanyID"), LookupInclude, ForeignKey("Companies", "ID"), LeftJoin(jCompany), TextualField(nameof(CompanyName))]
    public int? CompanyId
    {
        get => fields.CompanyId[this];
        set => fields.CompanyId[this] = value;
    }
    [DisplayName("Company"),Expression($"{jCompany}.[Name]"),LookupInclude]
    public string CompanyName
    {
        get => fields.CompanyName[this];
        set => fields.CompanyName[this] = value;
    }
    [LookupEditor(typeof(GroupsRow),FilterField = "IsActive",FilterValue = "1")]
    [ReadPermission(Administration.PermissionKeys.Group)]
    [DisplayName("Group"), Column("GroupID"), LookupInclude, ForeignKey("Groups", "ID"), LeftJoin(jGroup), TextualField(nameof(GroupName))]
    public int? GroupId
    {
        get => fields.GroupId[this];
        set => fields.GroupId[this] = value;
    }
    [DisplayName("Group"),Expression($"{jGroup}.[Name]"),LookupInclude]
    public string GroupName
    {
        get => fields.GroupName[this];
        set => fields.GroupName[this] = value;
    }
    public Int32Field CompanyIdField { get => Fields.CompanyId; }
    public Int32Field GroupIdField { get => Fields.GroupId; }
    
    public class RowFields : LoggingRowFields
    {
        public Int32Field Id;
        public Int32Field MaterialId;
        public Int32Field MaterialTemperId;
        public Int32Field MaterialShapeId;
        public Int32Field WeightDimensionUnitId;
        public Int32Field CurrencyId;
        public DecimalField UnitPrice;
        public DateTimeField FromDate;
        public DateTimeField ToDate;
        public Int32Field CompanyId;
        public StringField CompanyName;
        public Int32Field GroupId;
        public StringField GroupName;

        public StringField MaterialCode;
        public StringField WeightDimensionUnitCode;
        public StringField CurrencyCode;
    }
}