using FluentMigrator;

namespace DSRFQ.Migrations.DefaultDB;

/// <summary>
/// Records WHICH general tolerance was applied to a balloon, not just the numbers.
/// </summary>
/// <remarks>
/// A general tolerance is the drawing's title block speaking for a dimension
/// that prints none of its own. Storing only the resulting +/- loses the two
/// things anyone later needs to know: whether the value was read off the
/// drawing or inferred, and under which rule.
///
/// That distinction has consequences. A printed tolerance must never be
/// overwritten; an inferred one should be recomputed when the class changes
/// from .XXX to ISO 2768 m. Without this column the two are indistinguishable
/// and the safe move - never touch anything - makes the feature useless.
///
/// NULL therefore means "as printed on the drawing", which is the correct
/// reading for every row that exists today.
/// </remarks>
[DefaultDB, MigrationKey(20260905_1000)]
public class DefaultDB_20260905_1000_ToleranceStandard : Migration
{
    public override void Up()
    {
        // Text rather than a lookup id: the value is a label from a standard
        // (".XXX", "ISO 2768-1 m"), not an entity anything joins to, and the
        // set grows whenever a customer's title block says something new.
        Alter.Table("CostingPartBalloons")
            .AddColumn("ToleranceStandard").AsString(60).Nullable();
    }

    public override void Down()
    {
        Delete.Column("ToleranceStandard").FromTable("CostingPartBalloons");
    }
}
