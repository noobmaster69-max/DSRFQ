using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;

namespace DSRFQ.Master;

/// <summary>
/// An instrument a characteristic can be measured with - CMM, VMM, height gauge.
/// </summary>
/// <remarks>
/// Copied from DSEFACTORY's QcEquipmentTypes with the ids preserved, so a
/// balloon means the same instrument in both systems. See the migration
/// DefaultDB_20260907_1000_InspectionTools for why this is a shared table
/// rather than One Supply's per-machine QSettings list.
/// </remarks>
[ConnectionKey("Default"), Module("Master"), TableName("MasterInspectionTools")]
[DisplayName("Inspection Tools"), InstanceName("Inspection Tool")]
// "?" - any authenticated user, matching the feature symbol catalogue: whoever
// may open the drawing may see what measures it.
[ReadPermission("?")]
[ModifyPermission("Administration:General")]
[ServiceLookupPermission("?")]
[LookupScript("MasterInspectionTools", Permission = "?")]
public sealed class InspectionToolsRow : LoggingRow<InspectionToolsRow.RowFields>, IIdRow, INameRow
{
    [DisplayName("Id"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Name"), Size(100), QuickSearch]
    public string Name { get => fields.Name[this]; set => fields.Name[this] = value; }

    [DisplayName("Description"), Size(500)]
    public string Description { get => fields.Description[this]; set => fields.Description[this] = value; }

    /// <summary>
    /// What the lookup shows: "LM - Digital Lux Meter" where a description
    /// exists, otherwise the bare code. The codes are what the shop says out
    /// loud, so they lead; the expansion is there for the ones nobody can
    /// recall cold.
    /// </summary>
    [DisplayName("Name"), NameProperty]
    [Expression("(T0.Name + CASE WHEN ISNULL(T0.Description, '') = '' THEN '' " +
                "ELSE ' - ' + T0.Description END)")]
    public string CombinedName { get => fields.CombinedName[this]; set => fields.CombinedName[this] = value; }

    public class RowFields : LoggingRowFields
    {
        public Int32Field Id;
        public StringField Name;
        public StringField Description;
        public StringField CombinedName;
    }
}
