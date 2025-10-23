using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;
using DSRFQ.Company;
using DSRFQ.Modules.Common.Permissions;
using DSRFQ.Web.Modules;

namespace DSRFQ.Material;

[ConnectionKey("Default"), Module("Material"), TableName("Materials")]
[DisplayName("Materials"), InstanceName("Materials")]
[ReadPermission("?")]
[InsertPermission("?")]
[UpdatePermission("?")]
[DeletePermission("?")]
[NavigationPermission(MasterPermissionKeys.MasterMaterialNavigation)]

[ServiceLookupPermission("?")]

[LookupScript("Materials",Permission = "?",LookupType = typeof(MultiCompanyRowLookupScript<>))]
public sealed class MaterialsRow : LoggingRow<MaterialsRow.RowFields>, IIdRow, INameRow,IMultiCompanyRow
{
    const string jCompany = nameof(jCompany);
    const string jGroup = nameof(jGroup);

    [DisplayName("Id"), Column("ID"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Code"), Size(30), NotNull, QuickSearch, NameProperty]
    public string Code { get => fields.Code[this]; set => fields.Code[this] = value; }

    [DisplayName("Name"), Size(100), NotNull]
    public string Name { get => fields.Name[this]; set => fields.Name[this] = value; }

    [DisplayName("Description"), Size(500)]
    public string Description { get => fields.Description[this]; set => fields.Description[this] = value; }

    [DisplayName("Density"), Size(20), Scale(4)]
    public decimal? Density { get => fields.Density[this]; set => fields.Density[this] = value; }

    [DisplayName("Dimension Unit Id"), Column("DimensionUnitID")]
    public int? DimensionUnitId { get => fields.DimensionUnitId[this]; set => fields.DimensionUnitId[this] = value; }

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
        public StringField Code;
        public StringField Name;
        public StringField Description;
        public DecimalField Density;
        public Int32Field DimensionUnitId;
        public Int32Field CompanyId;
        public StringField CompanyName;
        public Int32Field GroupId;
        public StringField GroupName;
    }
}