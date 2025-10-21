using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;
using DSRFQ.Company;
using DSRFQ.Master;
using DSRFQ.Web.Modules;

namespace DSRFQ.Machines;

[ConnectionKey("Default"), Module("Machines"), TableName("Machines")]
[DisplayName("Machines"), InstanceName("Machines")]
[ReadPermission("?")]
[InsertPermission("?")]
[UpdatePermission("?")]
[DeletePermission("?")]
[NavigationPermission("?")]

[ServiceLookupPermission("?")]

[LookupScript("Machines",Permission = "?",LookupType = typeof(MultiCompanyRowLookupScript<>))]
public sealed class MachinesRow : LoggingRow<MachinesRow.RowFields>, IIdRow, INameRow,IMultiCompanyRow
{
    const string jCompany = nameof(jCompany);
    const string jGroup = nameof(jGroup);
    const string jCurrency = nameof(jCurrency);
    [DisplayName("Id"), Identity, IdProperty]
    public long? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Name"), NotNull, QuickSearch, NameProperty]
    public string Name { get => fields.Name[this]; set => fields.Name[this] = value; }

    [DisplayName("Description")]
    public string Description { get => fields.Description[this]; set => fields.Description[this] = value; }

    [DisplayName("Precision"), Size(20), Scale(4)]
    public decimal? Precision { get => fields.Precision[this]; set => fields.Precision[this] = value; }

    [DisplayName("Axis Number")]
    public int? AxisNumber { get => fields.AxisNumber[this]; set => fields.AxisNumber[this] = value; }

    [DisplayName("Cost"), Size(20), Scale(4)]
    public decimal? Cost { get => fields.Cost[this]; set => fields.Cost[this] = value; }

    [DisplayName("Work Envelope X"), Size(20), Scale(4)]
    public decimal? WorkEnvelopeX { get => fields.WorkEnvelopeX[this]; set => fields.WorkEnvelopeX[this] = value; }

    [DisplayName("Work Envelope Y"), Size(20), Scale(4)]
    public decimal? WorkEnvelopeY { get => fields.WorkEnvelopeY[this]; set => fields.WorkEnvelopeY[this] = value; }

    [DisplayName("Work Envelope Z"), Size(20), Scale(4)]
    public decimal? WorkEnvelopeZ { get => fields.WorkEnvelopeZ[this]; set => fields.WorkEnvelopeZ[this] = value; }

    [DisplayName("Weight Limit"), Size(20), Scale(4)]
    public decimal? WeightLimit { get => fields.WeightLimit[this]; set => fields.WeightLimit[this] = value; }

    [LookupEditor(typeof(CurrenciesRow))]
    [DisplayName("Currency"), Column("CurrencyID"), NotNull,ForeignKey("MasterCurrencies", "ID")]
    [LeftJoin(jCurrency), TextualField(nameof(CurrencyCode))]
    public int? CurrencyId { get => fields.CurrencyId[this]; set => fields.CurrencyId[this] = value; }
    [DisplayName("Currency Code"), Expression($"{jCurrency}.[Code]")]
    public string CurrencyCode
    {
        get => fields.CurrencyCode[this];
        set => fields.CurrencyCode[this] = value;
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
        public Int64Field Id;
        public StringField Name;
        public StringField Description;
        public DecimalField Precision;
        public Int32Field AxisNumber;
        public DecimalField Cost;
        public DecimalField WorkEnvelopeX;
        public DecimalField WorkEnvelopeY;
        public DecimalField WorkEnvelopeZ;
        public DecimalField WeightLimit;
        public Int32Field CurrencyId;
        public StringField CurrencyCode;
        public Int32Field CompanyId;
        public StringField CompanyName;
        public Int32Field GroupId;
        public StringField GroupName;        

    }
}