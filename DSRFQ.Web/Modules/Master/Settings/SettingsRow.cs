using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;

namespace DSRFQ.Master;

/// <summary>
/// The shop's ballooning conventions - one row, never more.
/// </summary>
/// <remarks>
/// See DefaultDB_20260907_1800_MasterSettings for why these moved out of
/// localStorage and config.yaml. The short version: the widget and the RFQ
/// consumer are two halves of the same feature and neither could read the
/// other's settings file.
///
/// [Insertable(false)], following DSEFACTORY's SystemSettingsRow: a second row
/// would be ambiguous. There is no matching [Deletable] in Serenity 8, so what
/// stops the row being deleted is that SettingsEndpoint exposes no Delete
/// action at all - which is the stronger guarantee anyway. The migration seeds
/// the one row.
///
/// Read permission is "?" - any authenticated user - because the widget loads
/// this on every drawing it opens. Modify is Administration:General, matching
/// the feature-symbol and inspection-tool catalogues: these are house
/// conventions, and one operator should not be able to renumber everyone
/// else's balloons.
/// </remarks>
[ConnectionKey("Default"), Module("Master"), TableName("MasterSettings")]
[DisplayName("Ballooning Settings"), InstanceName("Ballooning Settings")]
[ReadPermission("?")]
[ModifyPermission("Administration:General")]
[Insertable(false)]
public sealed class SettingsRow : Row<SettingsRow.RowFields>, IIdRow
{
    [DisplayName("Id"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Add Datums OCR Missed"), NotNull]
    [Description("Create a balloon for a datum that no recognised text covered. " +
                 "Off keeps the better classification of what was already found, " +
                 "without adding anything new.")]
    public bool? DatumAddMissing { get => fields.DatumAddMissing[this]; set => fields.DatumAddMissing[this] = value; }

    [DisplayName("Minimum Confidence To Add"), NotNull]
    [Description("Applies to added balloons only, on top of the API's own " +
                 "threshold of 0.5. Leave at 0 to accept whatever the API " +
                 "accepted; 0.8 adds only datums that had both a traced leader " +
                 "and a readable letter.")]
    public decimal? DatumAddMinConfidence { get => fields.DatumAddMinConfidence[this]; set => fields.DatumAddMinConfidence[this] = value; }

    [DisplayName("Sub-number Separator"), Size(3), NotNull]
    [Description("What goes between a parent balloon and its child: 5-1, 5.1, " +
                 "5/1, or anything else up to 3 characters. Not a digit, a " +
                 "space, or \"_\" - which already means a repeated instance.")]
    public string SubNumberSeparator { get => fields.SubNumberSeparator[this]; set => fields.SubNumberSeparator[this] = value; }

    /// <summary>
    /// Written by the widget's own dialogs, not typed here. They are JSON
    /// because they are shaped objects - see the migration.
    /// </summary>
    [DisplayName("Default Tolerances")]
    public string DefaultToleranceJson { get => fields.DefaultToleranceJson[this]; set => fields.DefaultToleranceJson[this] = value; }

    [DisplayName("Always-filter Keywords")]
    public string AlwaysFilterKeywords { get => fields.AlwaysFilterKeywords[this]; set => fields.AlwaysFilterKeywords[this] = value; }

    [DisplayName("Dimension Filters")]
    public string DimensionFiltersJson { get => fields.DimensionFiltersJson[this]; set => fields.DimensionFiltersJson[this] = value; }

    [DisplayName("Bubble Style")]
    public string BubbleStyleJson { get => fields.BubbleStyleJson[this]; set => fields.BubbleStyleJson[this] = value; }

    [DisplayName("Number Category Order")]
    public string PartitionOrderJson { get => fields.PartitionOrderJson[this]; set => fields.PartitionOrderJson[this] = value; }

    [DisplayName("Dimension Symbol Filter")]
    public string SymbolFilterJson { get => fields.SymbolFilterJson[this]; set => fields.SymbolFilterJson[this] = value; }

    [DisplayName("PDF Export Options")]
    public string PdfExportJson { get => fields.PdfExportJson[this]; set => fields.PdfExportJson[this] = value; }

    [DisplayName("Editor Defaults")]
    public string EditorDefaultsJson { get => fields.EditorDefaultsJson[this]; set => fields.EditorDefaultsJson[this] = value; }

    [DisplayName("Insert Date"), Insertable(false), Updatable(false)]
    public DateTime? InsertDate { get => fields.InsertDate[this]; set => fields.InsertDate[this] = value; }

    [DisplayName("Insert User Id"), Insertable(false), Updatable(false)]
    public int? InsertUserId { get => fields.InsertUserId[this]; set => fields.InsertUserId[this] = value; }

    [DisplayName("Update Date"), Insertable(false), Updatable(false)]
    public DateTime? UpdateDate { get => fields.UpdateDate[this]; set => fields.UpdateDate[this] = value; }

    [DisplayName("Update User Id"), Insertable(false), Updatable(false)]
    public int? UpdateUserId { get => fields.UpdateUserId[this]; set => fields.UpdateUserId[this] = value; }

    public class RowFields : RowFieldsBase
    {
        public Int32Field Id;
        public BooleanField DatumAddMissing;
        public DecimalField DatumAddMinConfidence;
        public StringField SubNumberSeparator;
        public StringField DefaultToleranceJson;
        public StringField AlwaysFilterKeywords;
        public StringField DimensionFiltersJson;
        public StringField BubbleStyleJson;
        public StringField PartitionOrderJson;
        public StringField SymbolFilterJson;
        public StringField PdfExportJson;
        public StringField EditorDefaultsJson;
        public DateTimeField InsertDate;
        public Int32Field InsertUserId;
        public DateTimeField UpdateDate;
        public Int32Field UpdateUserId;
    }
}
