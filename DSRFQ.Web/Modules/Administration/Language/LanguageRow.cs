namespace DSRFQ.Administration;

[ConnectionKey("Default"), Module("Administration"), TableName("Languages")]
[DisplayName("Languages"), InstanceName("Language"), GenerateFields]
[ReadPermission(PermissionKeys.Translation)]
[ModifyPermission(PermissionKeys.Translation)]
[LookupScript(Permission = "*")]
public sealed partial class LanguageRow : Row<LanguageRow.RowFields>
{
    [DisplayName("Language Id"), Size(10), NotNull, QuickSearch, IdProperty, Unique]
    public string LanguageId { get => fields.LanguageId[this]; set => fields.LanguageId[this] = value; }

    [DisplayName("Language Name"), Size(50), NotNull, QuickSearch, NameProperty]
    public string LanguageName { get => fields.LanguageName[this]; set => fields.LanguageName[this] = value; }
}