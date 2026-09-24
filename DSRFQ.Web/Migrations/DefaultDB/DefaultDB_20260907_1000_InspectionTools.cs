using FluentMigrator;
using FluentMigrator.SqlServer;

namespace DSRFQ.Migrations.DefaultDB;

/// <summary>
/// Which instrument measures a characteristic.
/// </summary>
/// <remarks>
/// Ported from One Supply's inspection-tool list, but seeded from DSEFACTORY's
/// QcEquipmentTypes rather than One Supply's own defaults. One Supply keeps its
/// list in QSettings - per machine, per operator, editable by anyone, shared
/// with nobody. That is fine for a desktop tool and wrong here: an inspection
/// report that says "CMM" has to mean the same instrument in DSRFQ as it does
/// in DSEFACTORY, or the two cannot be compared.
///
/// So the ids are preserved, exactly as with MasterFeatureSymbols. A balloon
/// then means the same thing by InspectionToolId in either system.
///
/// The names are abbreviations because that is what the shop uses - CMM, VMM,
/// HG. Descriptions are carried across where DSEFACTORY has them and left null
/// where it does not; inventing expansions would mean guessing, and a wrong
/// expansion in a dropdown is worse than a bare code an operator recognises.
/// </remarks>
[DefaultDB, MigrationKey(20260907_1000)]
public class DefaultDB_20260907_1000_InspectionTools : Migration
{
    public override void Up()
    {
        Create.Table("MasterInspectionTools")
            .WithColumn("Id").AsInt32().Identity().PrimaryKey().NotNullable()
            .WithColumn("Name").AsString(100).Nullable()
            .WithColumn("Description").AsString(500).Nullable()
            .WithColumn("InsertDate").AsDateTime().Nullable()
            .WithColumn("InsertUserId").AsInt32().Nullable()
            .WithColumn("UpdateDate").AsDateTime().Nullable()
            .WithColumn("UpdateUserId").AsInt32().Nullable()
            .WithColumn("DeleteDate").AsDateTime().Nullable()
            .WithColumn("DeleteUserId").AsInt32().Nullable()
            .WithColumn("IsActive").AsInt32().Nullable().WithDefaultValue(1);

        // Nullable, and that is a real answer rather than missing data: most
        // characteristics are measured by whatever is to hand, and forcing a
        // choice would fill the column with a default nobody meant.
        Alter.Table("CostingPartBalloons")
            .AddColumn("InspectionToolID").AsInt32().Nullable()
                .ForeignKey("FK_CostingPartBalloons_InspectionTool",
                            "MasterInspectionTools", "Id");

        Tool(10015, "BDG", null);
        Tool(10016, "CMM", null);
        Tool(10017, "DBG", null);
        Tool(10018, "DG", null);
        Tool(10019, "EM", null);
        Tool(10020, "HG", null);
        Tool(10021, "PG", null);
        Tool(10022, "PP", null);
        Tool(10023, "RG", null);
        Tool(10024, "TG", null);
        Tool(10025, "TH", null);
        Tool(10026, "VC", null);
        Tool(10027, "VMM", null);
        Tool(10028, "LM", "Digital Lux Meter");
        Tool(10029, "PL", "Precision Level");
        Tool(10030, "RFM", "Refractometer");
    }

    private void Tool(int id, string name, string description)
    {
        // WithIdentityInsert per row: the ids ARE the shared vocabulary, and
        // SET IDENTITY_INSERT is session state that SQL Server allows on only
        // one table at a time.
        Insert.IntoTable("MasterInspectionTools").WithIdentityInsert().Row(new
        {
            Id = id,
            Name = name,
            Description = description,
            InsertDate = System.DateTime.UtcNow,
            InsertUserId = 1,
            IsActive = 1
        });
    }

    public override void Down()
    {
        Delete.Column("InspectionToolID").FromTable("CostingPartBalloons");
        Delete.Table("MasterInspectionTools");
    }
}
