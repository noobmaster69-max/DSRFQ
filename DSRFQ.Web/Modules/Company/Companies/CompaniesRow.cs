using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;
using DSRFQ.Administration;
using DSRFQ.Modules.Common.Permissions;

namespace DSRFQ.Company;

[ConnectionKey("Default"), Module("Company"), TableName("Companies")]
[DisplayName("Companies"), InstanceName("Companies")]
[NavigationPermission(CompanyPermissionKeys.Navigation)]
[ReadPermission(CompanyPermissionKeys.View)]
[DeletePermission("?")]
[UpdatePermission("?")]
[InsertPermission("?")]
[ServiceLookupPermission("?")]
[LookupScript("Companies",Permission = "?")]
public sealed class CompaniesRow : LoggingRow<CompaniesRow.RowFields>, IIdRow, INameRow
{
    [DisplayName("Id"), Column("ID"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Name"), NotNull, QuickSearch, NameProperty]
    public string Name { get => fields.Name[this]; set => fields.Name[this] = value; }

    [DisplayName("Picture")]
    public string Picture { get => fields.Picture[this]; set => fields.Picture[this] = value; }
    [DisplayName("Organization Id"),Column("OrganizationID")]
    public string OrganizationId { get => fields.OrganizationId[this]; set => fields.OrganizationId[this] = value; }
    const string jGroup = nameof(jGroup);
    [LookupEditor(typeof(GroupsRow),FilterField = "IsActive",FilterValue = "1")]
    [ReadPermission(PermissionKeys.Group)]
    [DisplayName("Group"), Expression($"(select Top 1 GroupID FROM dbo.CompanyGroups WHERE CompanyID = T0.[ID] AND IsActive=1)"), LookupInclude, ForeignKey("Groups", "ID"), LeftJoin(jGroup), TextualField(nameof(GroupName))]
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
    [DisplayName("Companies")]
    [LookupEditor(typeof(CompaniesRow), Multiple = true,FilterField = "IsActive",FilterValue = "1",Delimited = true), NotMapped]
    
    public string CompanyGroupList
    {
        get => fields.CompanyGroupList[this];
        set => fields.CompanyGroupList[this] = value;
    }
    public Int32Field CompanyIdField { get => Fields.Id; }
    public Int32Field GroupIdField { get => Fields.GroupId; }
    public class RowFields : LoggingRowFields
    {
        public Int32Field Id;
        public StringField Name;
        public StringField Picture;
        public Int32Field GroupId;
        public StringField GroupName;
        public StringField CompanyGroupList;
        public StringField OrganizationId;

    }
}