using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;

namespace DSRFQ.Master;

/// <summary>
/// One GD&amp;T or dimensioning characteristic - flatness, position, diameter.
/// </summary>
/// <remarks>
/// A balloon's Symbol column holds the text recognition read. That is not the
/// same as what is being CONTROLLED: "⌖ ⌀.005 A B" and "TRUE POS .005" are one
/// characteristic written two ways, and neither is comparable to the other as a
/// string. This table is the vocabulary that makes them comparable, and the
/// consumer writes the matching id onto the balloon as it saves it.
///
/// Copied from DS_ERP with the ids preserved, so a balloon means the same thing
/// by FeatureSymbolId in either system.
/// </remarks>
[ConnectionKey("Default"), Module("Master"), TableName("MasterFeatureSymbols")]
[DisplayName("Feature Symbols"), InstanceName("Feature Symbol")]
[ReadPermission("?")]
[ModifyPermission("Administration:General")]
[ServiceLookupPermission("?")]
[LookupScript("MasterFeatureSymbols", Permission = "?")]
public sealed class FeatureSymbolsRow : LoggingRow<FeatureSymbolsRow.RowFields>, IIdRow, INameRow
{
    const string jFeatureCategory = nameof(jFeatureCategory);

    [DisplayName("Id"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Feature Category"), Column("FeatureCategoryID"),
     ForeignKey("MasterFeatureCategories", "Id"), LeftJoin(jFeatureCategory),
     TextualField(nameof(FeatureCategoryName))]
    [LookupEditor(typeof(FeatureCategoriesRow), FilterField = "IsActive", FilterValue = "1")]
    public int? FeatureCategoryId { get => fields.FeatureCategoryId[this]; set => fields.FeatureCategoryId[this] = value; }

    [DisplayName("Name"), Size(300), QuickSearch]
    public string Name { get => fields.Name[this]; set => fields.Name[this] = value; }

    [DisplayName("Symbol"), Size(300)]
    public string Symbol { get => fields.Symbol[this]; set => fields.Symbol[this] = value; }

    [DisplayName("Description"), Size(1000)]
    public string Description { get => fields.Description[this]; set => fields.Description[this] = value; }

    /// <summary>
    /// Reserved for pricing - a position tolerance is not the same amount of
    /// inspection work as a diameter. Null everywhere today.
    /// </summary>
    [DisplayName("Difficulty Weight"), Size(18), Scale(2)]
    public decimal? DifficultyWeight { get => fields.DifficultyWeight[this]; set => fields.DifficultyWeight[this] = value; }

    [DisplayName("Feature Category"), Expression($"{jFeatureCategory}.[Name]")]
    public string FeatureCategoryName { get => fields.FeatureCategoryName[this]; set => fields.FeatureCategoryName[this] = value; }

    /// <summary>
    /// What the lookup shows: "⌖ Position" rather than "Position", because the
    /// glyph is how the operator recognises the entry on the drawing in front
    /// of them, and several names read alike without it.
    /// </summary>
    [DisplayName("Name"), Expression("T0.Symbol + ' ' + T0.Name"), NameProperty]
    public string CombinedName { get => fields.CombinedName[this]; set => fields.CombinedName[this] = value; }

    public class RowFields : LoggingRowFields
    {
        public Int32Field Id;
        public Int32Field FeatureCategoryId;
        public StringField Name;
        public StringField Symbol;
        public StringField Description;
        public DecimalField DifficultyWeight;
        public StringField FeatureCategoryName;
        public StringField CombinedName;
    }
}
