using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;
using DSRFQ.Company;
using DSRFQ.Modules.Common.Permissions;
using DSRFQ.Web.Modules;

namespace DSRFQ.Master;

[ConnectionKey("Default"), Module("Master"), TableName("MasterSurfaceTreatmentProcesses")]
[DisplayName("Special Processes"), InstanceName("Special Processes")]
[ReadPermission("?")]
[InsertPermission("?")]
[UpdatePermission("?")]
[DeletePermission("?")]
[NavigationPermission(MasterPermissionKeys.MasterSpNavigation)]

[ServiceLookupPermission("?")]

[LookupScript("MasterSurfaceTreatmentProcesses",Permission = "?",LookupType = typeof(MultiCompanyRowLookupScript<>))]
public sealed class SurfaceTreatmentProcessesRow : LoggingRow<SurfaceTreatmentProcessesRow.RowFields>, IIdRow, INameRow,IMultiCompanyRow
{
    const string jCompany = nameof(jCompany);
    const string jGroup = nameof(jGroup);
    [DisplayName("Id"), Column("ID"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Name"), Size(500), QuickSearch, NameProperty]
    public string Name { get => fields.Name[this]; set => fields.Name[this] = value; }

    [DisplayName("Description"), Size(1000)]
    public string Description { get => fields.Description[this]; set => fields.Description[this] = value; }

    

    [DisplayName("Specification Number")]
    public string SpecificationNumber { get => fields.SpecificationNumber[this]; set => fields.SpecificationNumber[this] = value; }

    [DisplayName("Comments")]
    public string Comments { get => fields.Comments[this]; set => fields.Comments[this] = value; }

    [DisplayName("Restriction")]
    public string Restriction { get => fields.Restriction[this]; set => fields.Restriction[this] = value; }

    [DisplayName("Supplier Name")]
    public string SupplierName { get => fields.SupplierName[this]; set => fields.SupplierName[this] = value; }

    [DisplayName("Country")]
    public string Country { get => fields.Country[this]; set => fields.Country[this] = value; }

    [DisplayName("State")]
    public string State { get => fields.State[this]; set => fields.State[this] = value; }

    [DisplayName("City")]
    public string City { get => fields.City[this]; set => fields.City[this] = value; }

    [DisplayName("Date Approve"),DateEditor]
    public DateOnly? DateApprove { get => fields.DateApprove[this]; set => fields.DateApprove[this] = value; }

    [DisplayName("Date Expire"),DateEditor]
    public DateOnly? DateExpire { get => fields.DateExpire[this]; set => fields.DateExpire[this] = value; }

    [DisplayName("Capable"), NotNull]
    public bool? Capable { get => fields.Capable[this]; set => fields.Capable[this] = value; }
    
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
    [MasterDetailRelation(foreignKey: "SurfaceTreatmentProcessID")]
    [DisplayName("Cost Items"), NotMapped]
    [MinSelectLevel(SelectLevel.List)]
    public List<SurfaceTreatmentProcessCostsRow> CostItems
    {
        get => fields.CostItems[this];
        set => fields.CostItems[this] = value;
    }
    public class RowFields : LoggingRowFields
    {
        public Int32Field Id;
        public StringField Name;
        public StringField Description;
        
        public StringField SpecificationNumber;
        public StringField Comments;
        public StringField Restriction;
        public StringField SupplierName;
        public StringField Country;
        public StringField State;
        public StringField City;
        public DateOnlyField DateApprove;
        public DateOnlyField DateExpire;
        public BooleanField Capable;
        public Int32Field CompanyId;
        public StringField CompanyName;
        public Int32Field GroupId;
        public StringField GroupName;
        public readonly RowListField<SurfaceTreatmentProcessCostsRow> CostItems;

    }
}