using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;
using DSRFQ.Administration;

namespace DSRFQ.Company;

[ConnectionKey("Default"), Module("Company"), TableName("Groups")]
[DisplayName("Groups"), InstanceName("Groups")]
[NavigationPermission(PermissionKeys.Group)]
[ReadPermission(PermissionKeys.Group)]
[DeletePermission(PermissionKeys.Group)]
[ModifyPermission(PermissionKeys.Group)]
[LookupScript("Groups",Permission="?")]

public sealed class GroupsRow : LoggingRow<GroupsRow.RowFields>, IIdRow, INameRow
{
    [DisplayName("Id"), Column("ID"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Name"), NotNull, QuickSearch, NameProperty]
    public string Name { get => fields.Name[this]; set => fields.Name[this] = value; }

    [DisplayName("Description")]
    public string Description { get => fields.Description[this]; set => fields.Description[this] = value; }

    [DisplayName("Companies")]
    [LookupEditor(typeof(CompaniesRow), Multiple = true,FilterField = "IsActive",FilterValue = "1"),NotMapped]
    [LinkingSetRelation(typeof(CompanyGroupsRow), "GroupID", "CompanyID")]

    public List<int> CompanyList
    {
        get => fields.CompanyList[this];
        set => fields.CompanyList[this] = value;
    }
    public class RowFields : LoggingRowFields
    {
        public Int32Field Id;
        public StringField Name;
        public StringField Description;
        public ListField<Int32> CompanyList;


    }
}