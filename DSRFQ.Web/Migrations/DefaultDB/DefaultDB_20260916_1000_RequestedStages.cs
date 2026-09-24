using FluentMigrator;

namespace DSRFQ.Migrations.DefaultDB;

/// <summary>
/// Which stages the uploader asked for: drawing, costing, ballooning.
/// </summary>
/// <remarks>
/// A part uploaded only to be ballooned still went through costing, which on a
/// drawing with no 3D model fails after minutes of waiting, and through drawing
/// conversion it did not need. The upload dialog now offers the three stages,
/// all ticked, and stores the choice here as a comma-separated list
/// ("drawing,costing,ballooning"). NULL means every stage, so every part that
/// predates this column, and anything created outside the dialog, behaves
/// exactly as before.
///
/// A stage nobody asked for is not left Pending: it gets its own status, so the
/// grid can say "Skipped" rather than showing work that will never start.
/// </remarks>
[DefaultDB, MigrationKey(20260916_1000)]
public class DefaultDB_20260916_1000_RequestedStages : Migration
{
    public override void Up()
    {
        Alter.Table("CostingParts")
            .AddColumn("RequestedStages").AsString(100).Nullable();

        // Id 7: the ids are referenced directly by the consumer and the grid,
        // so this is an append, never a renumber.
        Execute.Sql(@"
            IF NOT EXISTS (SELECT 1 FROM dbo.MasterCostingStatus WHERE ID = 7)
                SET IDENTITY_INSERT dbo.MasterCostingStatus ON;
            IF NOT EXISTS (SELECT 1 FROM dbo.MasterCostingStatus WHERE ID = 7)
                INSERT INTO dbo.MasterCostingStatus (ID, Name, Color, InsertDate, InsertUserId, IsActive)
                VALUES (7, 'Skipped', '#8b5cf6', GETDATE(), 1, 1);
            IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.MasterCostingStatus'))
                SET IDENTITY_INSERT dbo.MasterCostingStatus OFF;");
    }

    public override void Down()
    {
        Delete.Column("RequestedStages").FromTable("CostingParts");
        Execute.Sql("DELETE FROM dbo.MasterCostingStatus WHERE ID = 7;");
    }
}
