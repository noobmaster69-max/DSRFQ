using FluentMigrator;

namespace DSRFQ.Migrations.DefaultDB;

/// <summary>
/// The two narrative fields new_tsh's process analysis returns and nothing kept.
/// </summary>
/// <remarks>
/// /gongyi_tsh answers with 41 fields. The consumer already stores the ones
/// that carry numbers - the operation hours, the machine, NumberOfFace,
/// NumberOfHole, the volumes and weights - and drops the two that carry words:
///
///   specific_recommendations  what to watch when preparing the part
///   quality_control           what to check once it is machined
///
/// Both arrive as arrays of strings and are joined into one block here, because
/// nothing downstream indexes or filters an individual line; they are read.
///
/// Nullable, because a part costed before this migration has neither, and an
/// analysis that returns an empty array should read as "nothing to say" rather
/// than as an empty string that looks like a failed write.
/// </remarks>
[DefaultDB, MigrationKey(20260826_1700)]
public class DefaultDB_20260826_1700_ProcessAnalysisNotes : Migration
{
    public override void Up()
    {
        Alter.Table("CostingParts")
            .AddColumn("ProcessRecommendations").AsString(int.MaxValue).Nullable()
            .AddColumn("QualityControlNotes").AsString(int.MaxValue).Nullable();
    }

    public override void Down()
    {
        Delete.Column("ProcessRecommendations").FromTable("CostingParts");
        Delete.Column("QualityControlNotes").FromTable("CostingParts");
    }
}
