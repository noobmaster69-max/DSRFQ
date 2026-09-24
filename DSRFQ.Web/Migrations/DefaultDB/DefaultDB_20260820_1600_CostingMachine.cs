using FluentMigrator;

namespace DSRFQ.Migrations.DefaultDB;

/// <summary>
/// Records which machine a costing was actually priced on.
/// </summary>
/// <remarks>
/// The rate that produces the quote comes from a row in new_tsh's own MySQL
/// (fa_supplier_equipment), which DSRFQ cannot reach. Until now nothing crossed
/// the boundary: the operator saw a price with no way to tell whether it was
/// costed on a real 5-axis machine or on the 45/hr default new_tsh falls back to
/// when no machine in the database fits the part. Those two numbers mean very
/// different things when you are quoting.
///
/// The name is resolved on the new_tsh side and stored denormalised here, for
/// the same reason - there is no join available across the two databases.
/// </remarks>
[DefaultDB, MigrationKey(20260820_1600)]
public class DefaultDB_20260820_1600_CostingMachine : Migration
{
    public override void Up()
    {
        Alter.Table("CostingParts")
            // fa_supplier_equipment.id of the machine that set the rate. Not a
            // foreign key: the table it points at is in another database, on
            // another engine.
            .AddColumn("CostingMachineID").AsInt32().Nullable()
            // The second machine, and only for turn-mill, where one run needs a
            // lathe as well as a mill. Null for single-process parts rather than
            // a copy of CostingMachineID, so "two machines" stays distinguishable
            // from "one machine, recorded twice".
            .AddColumn("CostingMachineID2").AsInt32().Nullable()
            .AddColumn("CostingMachineSupplierID").AsInt32().Nullable()
            // Human readable, e.g. "DMG MORI 3-axis 1200x600x500", or
            // "Default rates (no matching machine)" when nothing matched. This
            // is what the grid shows.
            .AddColumn("CostingMachineName").AsString(300).Nullable();
    }

    public override void Down()
    {
        Delete.Column("CostingMachineID")
              .Column("CostingMachineID2")
              .Column("CostingMachineSupplierID")
              .Column("CostingMachineName")
              .FromTable("CostingParts");
    }
}
