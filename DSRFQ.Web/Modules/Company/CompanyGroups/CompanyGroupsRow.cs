using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;
using DSRFQ.Modules.Common.Permissions;

namespace DSRFQ.Company;

[ConnectionKey("Default"), Module("Company"), TableName("CompanyGroups")]
[DisplayName("Company Groups"), InstanceName("Company Groups")]
[NavigationPermission(CompanyPermissionKeys.Navigation)]
[ReadPermission(CompanyPermissionKeys.View)]
[DeletePermission(CompanyPermissionKeys.Delete)]
[UpdatePermission(CompanyPermissionKeys.Update)]
[InsertPermission(CompanyPermissionKeys.Insert)]
[ServiceLookupPermission("?")]
[LookupScript("CompanyGroups",Permission = "?")]
public sealed class CompanyGroupsRow : LoggingRow<CompanyGroupsRow.RowFields>, IIdRow
{
    const string jCompany = nameof(jCompany);
    const string jGroup = nameof(jGroup);

    [DisplayName("Id"), Column("ID"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Company"), Column("CompanyID"), NotNull, ForeignKey("Companies", "ID"), LeftJoin(jCompany)]
    [TextualField(nameof(CompanyName))]
    public int? CompanyId { get => fields.CompanyId[this]; set => fields.CompanyId[this] = value; }

    [DisplayName("Group"), Column("GroupID"), NotNull, ForeignKey(typeof(GroupsRow)), LeftJoin(jGroup), TextualField(nameof(GroupName))]
    [ServiceLookupEditor(typeof(GroupsRow))]
    public int? GroupId { get => fields.GroupId[this]; set => fields.GroupId[this] = value; }

    
    [DisplayName("Company Name"), Expression($"{jCompany}.[Name]")]
    public string CompanyName { get => fields.CompanyName[this]; set => fields.CompanyName[this] = value; }

    [DisplayName("Group Name"), Origin(jGroup, nameof(GroupsRow.Name))]
    public string GroupName { get => fields.GroupName[this]; set => fields.GroupName[this] = value; }

    public class RowFields : LoggingRowFields
    {
        public Int32Field Id;
        public Int32Field CompanyId;
        public Int32Field GroupId;
        
        public StringField CompanyName;
        public StringField GroupName;
    }
}