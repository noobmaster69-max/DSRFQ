using FluentMigrator;

namespace DSRFQ.Migrations.DefaultDB;

/// <summary>
/// The shop's ballooning conventions, in one row.
/// </summary>
/// <remarks>
/// These settings had no server-side home. Four of them lived in the browser's
/// localStorage and three in the RFQ consumer's config.yaml, which meant the two
/// halves of the same feature could not see each other's answer: the consumer
/// decides whether to CREATE a datum balloon, the widget decides whether to SHOW
/// it, and neither could read the other's setting.
///
/// localStorage was the worse of the two. Every one of those settings describes
/// the shop rather than the browser - their own comments say so - yet being
/// per-browser meant one operator could number a child balloon "5-1" while
/// another numbered it "5.1" on the same drawing, and clearing a cache silently
/// reset the house convention.
///
/// One row, never inserted and never deleted, following DSEFACTORY's
/// dbo.SystemSettings. The row is seeded here rather than left to the
/// application so there is always something to read.
///
/// The dividing line this leaves: config.yaml keeps only what the consumer needs
/// in order to REACH this table - driver, server, credentials, queue and service
/// URLs. Everything downstream of a working connection lives here. The consumer
/// still falls back to its config.yaml values when the table cannot be read, so
/// an installation that deploys the consumer before this migration runs keeps
/// working rather than silently changing behaviour.
/// </remarks>
[DefaultDB, MigrationKey(20260907_1800)]
public class DefaultDB_20260907_1800_MasterSettings : Migration
{
    public override void Up()
    {
        Create.Table("MasterSettings")
            .WithColumn("Id").AsInt32().Identity().PrimaryKey().NotNullable()

            // --- Datum feature detection, read by the RFQ consumer ------------
            // Let RPA/API's geometric pass decide IsDatum where it found a
            // triangle sitting on a balloon. Off falls back to the symbol test
            // on the recognised text, which only sees the datums whose triangle
            // survived OCR.
            .WithColumn("DatumDetectionEnabled").AsBoolean().NotNullable()
                .WithDefaultValue(true)
            // The half that CREATES rows rather than flagging existing ones, so
            // it gets its own switch: a false positive here puts a line in the
            // inspection report that is not on the drawing.
            .WithColumn("DatumAddMissing").AsBoolean().NotNullable()
                .WithDefaultValue(true)
            // A floor for the added rows only, on top of the API's own 0.5.
            // 0 defers to the API, which is the shipped default.
            .WithColumn("DatumAddMinConfidence").AsDecimal(3, 2).NotNullable()
                .WithDefaultValue(0)

            // --- House conventions, read by the ballooning widget -------------
            // The character between a parent balloon number and its child. Its
            // width is 1 because the parser only accepts "-", "." or "/", and a
            // wider column would invite a value that round-trips to balloon 0.
            .WithColumn("SubNumberSeparator").AsString(1).NotNullable()
                .WithDefaultValue("-")

            // JSON rather than columns, for the three that are shaped objects
            // rather than scalars. Typing the tolerance settings alone would
            // take fifteen columns and would have to change every time a
            // decimal-place scheme gained a row; the widget already parses and
            // deep-merges these blobs over its own defaults, so a blob written
            // by an older build still loads.
            .WithColumn("DefaultToleranceJson").AsString(int.MaxValue).Nullable()
            .WithColumn("AlwaysFilterKeywords").AsString(int.MaxValue).Nullable()
            .WithColumn("DimensionFiltersJson").AsString(int.MaxValue).Nullable()

            .WithColumn("InsertDate").AsDateTime().Nullable()
            .WithColumn("InsertUserId").AsInt32().Nullable()
            .WithColumn("UpdateDate").AsDateTime().Nullable()
            .WithColumn("UpdateUserId").AsInt32().Nullable();

        // The single row. Every column takes its default, so the shipped
        // behaviour is exactly what config.yaml and the widget defaults did
        // before this table existed - moving the settings must not change any
        // of them.
        Insert.IntoTable("MasterSettings").Row(new
        {
            DatumDetectionEnabled = true,
            DatumAddMissing = true,
            DatumAddMinConfidence = 0m,
            SubNumberSeparator = "-",
        });
    }

    public override void Down()
    {
        Delete.Table("MasterSettings");
    }
}
