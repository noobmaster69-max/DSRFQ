using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;
using DSRFQ.Modules.Common.Permissions;

namespace DSRFQ.Master;

[ConnectionKey("Default"), Module("Master"), TableName("MasterCostingStatus")]
[DisplayName("Costing Status"), InstanceName("Costing Status")]
[NavigationPermission(MasterPermissionKeys.MasterStatusNavigation)]
[ReadPermission(MasterPermissionKeys.MasterStatusView)]
[DeletePermission(MasterPermissionKeys.MasterStatusDelete)]
[UpdatePermission(MasterPermissionKeys.MasterStatusUpdate)]
[InsertPermission(MasterPermissionKeys.MasterStatusInsert)]
[ServiceLookupPermission("?")]
[LookupScript("MasterCostingStatus",Permission = "?")]
public sealed class CostingStatusRow : LoggingRow<CostingStatusRow.RowFields>, IIdRow, INameRow
{
    [DisplayName("Id"), Column("ID"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Name"), Size(100), NotNull, QuickSearch, NameProperty]
    public string Name { get => fields.Name[this]; set => fields.Name[this] = value; }

    [DisplayName("Color"), Size(300)]
    public string Color { get => fields.Color[this]; set => fields.Color[this] = value; }

    

    public class RowFields : LoggingRowFields
    {
        public Int32Field Id;
        public StringField Name;
        public StringField Color;
        

    }
}