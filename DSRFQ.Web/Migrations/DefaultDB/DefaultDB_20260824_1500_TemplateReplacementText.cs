using FluentMigrator;

namespace DSRFQ.Migrations.DefaultDB;

/// <summary>
/// The word stamped over the customer's name on a converted drawing.
/// </summary>
/// <remarks>
/// This was the string literal "TSH" inside apply_dynamic_redaction
/// (RFQ/function.py), so changing who the drawings are re-branded for meant
/// editing the consumer and restarting it. It belongs with the rest of the
/// conversion template: the artwork, the logo and the box coordinates are
/// already rows here, and the replacement word is the same kind of decision.
///
/// Nullable, and the consumer falls back to "TSH" when it is empty, so existing
/// templates keep working untouched.
/// </remarks>
[DefaultDB, MigrationKey(20260824_1500)]
public class DefaultDB_20260824_1500_TemplateReplacementText : Migration
{
    public override void Up()
    {
        Alter.Table("ToolTemplateConversion")
            .AddColumn("ReplacementText").AsString(100).Nullable();

        // Seed the templates that already exist with the value that was
        // hardcoded, so a re-run before anyone edits them produces exactly what
        // it produced yesterday.
        Execute.Sql(
            "UPDATE dbo.ToolTemplateConversion SET ReplacementText = 'TSH' " +
            "WHERE ReplacementText IS NULL");
    }

    public override void Down()
    {
        Delete.Column("ReplacementText").FromTable("ToolTemplateConversion");
    }
}
