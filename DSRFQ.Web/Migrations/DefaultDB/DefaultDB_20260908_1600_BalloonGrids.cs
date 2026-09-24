using FluentMigrator;

namespace DSRFQ.Migrations.DefaultDB;

/// <summary>
/// Where a page's grid lines actually fall, once someone has corrected them.
/// </summary>
/// <remarks>
/// The sheet's grid EXTENT already travels on every balloon - GridStart and
/// GridEnd, "D8" to "A1" - and that is enough to sort by cell. What was missing
/// is the geometry: which pixel column the line between 3 and 4 sits at. Without
/// it a balloon's Section is whatever recognition decided, and an operator who
/// can see it is wrong has no way to say so.
///
/// One row per page that has been adjusted; a page nobody has touched has no
/// row and falls back to equal spacing across the sheet, which is what
/// recognition assumes anyway.
///
/// The lines are JSON arrays of page percentages, ascending and including both
/// outer borders - so a sheet with 8 columns stores 9 x-lines. Percentages
/// rather than pixels for the same reason as every other coordinate in these
/// tables: the page is re-rendered at different resolutions and a profile in
/// pixels would silently stop lining up.
///
/// JSON rather than a row per line: the lines are only ever read and written as
/// a complete set - a half-applied grid is not a thing - and a table of
/// thousands of single-number rows would buy nothing.
/// </remarks>
[DefaultDB, MigrationKey(20260908_1600)]
public class DefaultDB_20260908_1600_BalloonGrids : Migration
{
    public override void Up()
    {
        Create.Table("CostingPartBalloonGrids")
            .WithColumn("ID").AsInt32().Identity().PrimaryKey().NotNullable()
            .WithColumn("CostingPartID").AsInt32().NotNullable()
                .ForeignKey("FK_CostingPartBalloonGrids_CostingParts",
                            "CostingParts", "ID")
            .WithColumn("PageNumber").AsInt32().NotNullable()
            .WithColumn("XLines").AsString(int.MaxValue).Nullable()
            .WithColumn("YLines").AsString(int.MaxValue).Nullable()
            .WithColumn("InsertDate").AsDateTime().Nullable()
            .WithColumn("InsertUserId").AsInt32().Nullable()
            .WithColumn("UpdateDate").AsDateTime().Nullable()
            .WithColumn("UpdateUserId").AsInt32().Nullable()
            .WithColumn("DeleteDate").AsDateTime().Nullable()
            .WithColumn("DeleteUserId").AsInt32().Nullable()
            .WithColumn("IsActive").AsInt32().Nullable().WithDefaultValue(1);

        // One live grid per page. Filtered so the soft-deleted rows a
        // LoggingRow leaves behind do not collide with the row replacing them.
        Execute.Sql(
            "CREATE UNIQUE INDEX UX_CostingPartBalloonGrids_Part_Page " +
            "ON dbo.CostingPartBalloonGrids (CostingPartID, PageNumber) " +
            "WHERE IsActive = 1;");
    }

    public override void Down()
    {
        Delete.Table("CostingPartBalloonGrids");
    }
}
