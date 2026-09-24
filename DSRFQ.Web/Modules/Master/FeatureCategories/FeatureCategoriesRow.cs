using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;

namespace DSRFQ.Master;

/// <summary>
/// The grouping a feature symbol belongs to - form, profile, orientation,
/// location, runout, dimensioning, modifiers.
/// </summary>
/// <remarks>
/// Copied from DS_ERP, ids and all, by DefaultDB_20260901_1500_FeatureSymbols.
/// It exists mainly so the symbol lookup can be read as a list a machinist
/// recognises, and so detection can prefer a geometric characteristic over a
/// plain diameter when a balloon's text carries both.
/// </remarks>
[ConnectionKey("Default"), Module("Master"), TableName("MasterFeatureCategories")]
[DisplayName("Feature Categories"), InstanceName("Feature Category")]
// Read is "?" - any authenticated user - because the ballooning workspace needs
// the vocabulary to render a balloon's characteristic, and every user of that
// workspace is already allowed to see the drawing itself.
[ReadPermission("?")]
[ModifyPermission("Administration:General")]
[ServiceLookupPermission("?")]
[LookupScript("MasterFeatureCategories", Permission = "?")]
public sealed class FeatureCategoriesRow : LoggingRow<FeatureCategoriesRow.RowFields>, IIdRow, INameRow
{
    [DisplayName("Id"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Name"), Size(300), QuickSearch, NameProperty]
    public string Name { get => fields.Name[this]; set => fields.Name[this] = value; }

    [DisplayName("Description"), Size(1000)]
    public string Description { get => fields.Description[this]; set => fields.Description[this] = value; }

    public class RowFields : LoggingRowFields
    {
        public Int32Field Id;
        public StringField Name;
        public StringField Description;
    }
}
