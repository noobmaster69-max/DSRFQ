using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;
using DSRFQ.Modules.Common.Permissions;

namespace DSRFQ.Master;

[ConnectionKey("Default"), Module("Master"), TableName("MasterDimensionUnits")]
[DisplayName("Dimension Units"), InstanceName("Dimension Units")]
[NavigationPermission(MasterPermissionKeys.MasterDimensionUnitNavigation)]
[ReadPermission(MasterPermissionKeys.MasterDimensionUnitView)]
[DeletePermission(MasterPermissionKeys.MasterDimensionUnitDelete)]
[UpdatePermission(MasterPermissionKeys.MasterDimensionUnitUpdate)]
[InsertPermission(MasterPermissionKeys.MasterDimensionUnitInsert)]
[ServiceLookupPermission("?")]
[LookupScript("MasterDimensionUnits",Permission = "?")]
public sealed class DimensionUnitsRow : LoggingRow<DimensionUnitsRow.RowFields>, IIdRow, INameRow
{
    [DisplayName("Id"), Column("ID"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Code"), Size(30), NotNull, QuickSearch, NameProperty]
    public string Code { get => fields.Code[this]; set => fields.Code[this] = value; }

    [DisplayName("Name"), Size(100), NotNull]
    public string Name { get => fields.Name[this]; set => fields.Name[this] = value; }

    
    public class RowFields : LoggingRowFields
    {
        public Int32Field Id;
        public StringField Code;
        public StringField Name;
   

    }
}