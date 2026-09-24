using FluentMigrator;

namespace DSRFQ.Migrations.DefaultDB;

/// <summary>
/// The machines that could have run each costing process, not just the one that did.
/// </summary>
/// <remarks>
/// new_tsh reports a single machine per process and its choice cannot be
/// trusted: the axis filter compares a row against a value it has just written
/// into that same row (gongyi_tsh.py:1114), and every candidate is scored with
/// one flat rate instead of its own, so "cheapest suitable machine" collapses
/// into "first row of fa_supplier_equipment". On part 10 that picked a 5-axis
/// machine at 50/h for a 3-axis job when a 3-axis machine at 40/h was sitting
/// in the same supplier's list.
///
/// Rather than have the operator trust that, this records every machine that
/// physically fits the process so the workspace can show the field and let a
/// person pick. Choosing is a manufacturing judgement -- a bigger machine may
/// be right because it is free this week -- and it is not one the pipeline is
/// in a position to make.
///
/// Grain is one row per (cost line, candidate machine). Per line, not per part:
/// a part's milling and turning run on different machines, and the whole point
/// is that each process is chosen separately.
/// </remarks>
[DefaultDB, MigrationKey(20260821_1700)]
public class DefaultDB_20260821_1700_CostingMachineOptions : Migration
{
    public override void Up()
    {
        Create.Table("CostingPartMachineOptions")
            .WithColumn("ID").AsInt32().Identity().PrimaryKey().NotNullable()

            // Denormalised from the cost line so a part's options can be read
            // and cleared without joining, which is most of what happens here.
            .WithColumn("CostingPartID").AsInt32().NotNullable()
            .WithColumn("CostingPartCostingResultID").AsInt32().NotNullable()

            .WithColumn("MachineID").AsInt32().NotNullable()

            // Snapshot of dbo.Machines.Cost when the options were built. Kept
            // so a quote can still explain the number it was priced at after
            // someone edits the machine's rate.
            .WithColumn("HourlyRate").AsDecimal(18, 4).Nullable()
            .WithColumn("CurrencyID").AsInt32().Nullable()

            // Cost of this process on this machine: hours x HourlyRate. Stored
            // so the UI can rank and show the delta without recomputing.
            .WithColumn("LineTotal").AsDecimal(18, 4).Nullable()

            // The machine currently on the cost line.
            .WithColumn("IsSelected").AsInt16().NotNullable().WithDefaultValue(0)
            // What the pipeline itself came back with, kept even after someone
            // overrides it, so "what did it suggest" stays answerable.
            .WithColumn("IsRecommended").AsInt16().NotNullable().WithDefaultValue(0)
            // Set when a person picked it, so a re-cost can restore the choice
            // instead of silently reverting to the pipeline's.
            .WithColumn("IsUserChoice").AsInt16().NotNullable().WithDefaultValue(0)

            // Why this machine is on the list -- and, when false, why it is
            // shown greyed rather than hidden. An operator overriding a
            // capability limit should see what they are overriding.
            .WithColumn("FitsEnvelope").AsInt16().NotNullable().WithDefaultValue(1)
            .WithColumn("FitsWeight").AsInt16().NotNullable().WithDefaultValue(1)
            .WithColumn("AxisSufficient").AsInt16().NotNullable().WithDefaultValue(1)

            // DeleteDate/DeleteUserId are not optional: DSRFQ's LoggingRow
            // implements IDeleteLogRow, so a row without them fails to map.
            .WithColumn("InsertDate").AsDateTime().NotNullable().WithDefault(SystemMethods.CurrentDateTime)
            .WithColumn("InsertUserId").AsInt32().NotNullable().WithDefaultValue(1)
            .WithColumn("UpdateDate").AsDateTime().Nullable()
            .WithColumn("UpdateUserId").AsInt32().Nullable()
            .WithColumn("DeleteDate").AsDateTime().Nullable()
            .WithColumn("DeleteUserId").AsInt32().Nullable()
            .WithColumn("IsActive").AsInt16().NotNullable().WithDefaultValue(1);

        // The workspace always asks for one part's options, cheapest first.
        Create.Index("IX_CostingPartMachineOptions_Part")
            .OnTable("CostingPartMachineOptions")
            .OnColumn("CostingPartID").Ascending()
            .OnColumn("CostingPartCostingResultID").Ascending()
            .OnColumn("HourlyRate").Ascending();

        // One row per machine per line. Rebuilding the options for a line must
        // not be able to double them up.
        Create.Index("UX_CostingPartMachineOptions_Line")
            .OnTable("CostingPartMachineOptions")
            .OnColumn("CostingPartCostingResultID").Ascending()
            .OnColumn("MachineID").Ascending()
            .WithOptions().Unique();
    }

    public override void Down()
    {
        Delete.Table("CostingPartMachineOptions");
    }
}
