using FluentMigrator;

namespace DSRFQ.Migrations.DefaultDB;

/// <summary>
/// Records the machine per cost line, not per part.
/// </summary>
/// <remarks>
/// DefaultDB_20260820_1600 put a single machine on CostingParts. That is wrong
/// for turn-mill: new_tsh's yeschexi matches a mill and a lathe and prices the
/// milling and turning lines at two different rates, so "which machine was this
/// part cut on" has two answers. It also attached a machine to Material Cost,
/// which is not machine work at all.
///
/// The rate lives on the line - "Milling Roughing, 0.38 h at 45.00" - so the
/// machine that set that rate belongs on the same row. The part-level columns
/// are kept as a summary for the grid, where one column per part is what fits.
/// </remarks>
[DefaultDB, MigrationKey(20260821_1200)]
public class DefaultDB_20260821_1200_CostingResultMachine : Migration
{
    public override void Up()
    {
        Alter.Table("CostingPartCostingResults")
            // fa_supplier_equipment.id. Not a foreign key - that table is in
            // another database on another engine. Null on lines that are not
            // machine time (material, special process).
            .AddColumn("MachineID").AsInt32().Nullable()
            .AddColumn("MachineName").AsString(200).Nullable();
    }

    public override void Down()
    {
        Delete.Column("MachineID").Column("MachineName")
              .FromTable("CostingPartCostingResults");
    }
}
