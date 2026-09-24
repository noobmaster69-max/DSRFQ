using FluentMigrator;

namespace DSRFQ.Migrations.DefaultDB;

/// <summary>
/// Widen SubNumberSeparator so the shop can type its own mark.
/// </summary>
/// <remarks>
/// It was nvarchar(1) with the UI offering a choice of three, because
/// parseBalloonNumber matched a fixed list and anything outside it round-tripped
/// through BalloonNo as balloon 0.
///
/// The parser now reads the separator structurally - the non-digits between the
/// two numbers - so any mark round-trips, and a drawing written under the old
/// one keeps loading after the setting changes. Three characters matches One
/// Supply's own limit; the validation lives in SettingsSaveHandler and
/// isValidSubSeparator, which agree on refusing only digits, whitespace and "_".
/// </remarks>
[DefaultDB, MigrationKey(20260908_1400)]
public class DefaultDB_20260908_1400_SeparatorFreeText : Migration
{
    public override void Up()
    {
        Alter.Table("MasterSettings")
            .AlterColumn("SubNumberSeparator").AsString(3).NotNullable();
    }

    public override void Down()
    {
        // Anything longer than one character would not fit, and a truncated
        // separator is worse than the default: it would round-trip to a
        // different mark than the one the shop chose.
        Execute.Sql("UPDATE dbo.MasterSettings SET SubNumberSeparator = '-' " +
                    "WHERE LEN(SubNumberSeparator) > 1;");
        Alter.Table("MasterSettings")
            .AlterColumn("SubNumberSeparator").AsString(1).NotNullable();
    }
}
