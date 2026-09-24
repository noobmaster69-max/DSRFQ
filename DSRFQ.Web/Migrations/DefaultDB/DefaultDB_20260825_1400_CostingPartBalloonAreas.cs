using FluentMigrator;

namespace DSRFQ.Migrations.DefaultDB;

/// <summary>
/// Areas drawn on a drawing to control how the balloons inside them are
/// numbered.
/// </summary>
/// <remarks>
/// An operator boxes part of the sheet and picks a rule for it - reading order,
/// a single row left to right, a clockwise sweep about the box's centre, and so
/// on. Renumber then walks the boxes in their own order, numbers each box's
/// contents by that box's rule, and sweeps up whatever no box claimed. Ported
/// from the PyQt tool's AreaRegion (RPA/Bubble ui/region_items.py).
///
/// Without this table the areas live only in the widget's memory, so a reload
/// loses the layout and the next Renumber silently produces a different answer
/// from the one the operator approved. The rule has to outlive the session for
/// the numbering to be reproducible at all.
///
/// Shaped to match CostingPartBalloonMaskZones, its nearest neighbour: same
/// per-part / per-page ownership, same X1/Y1/X2/Y2 corners in percent of page
/// (0-100), same LoggingRow columns and soft delete.
///
/// Deliberately NOT stored:
///   Color   - derived from OrderIndex against a fixed palette. Storing it lets
///             the two drift once areas are reordered, and it is presentation.
///   Centre  - the circular sort modes take the centre of the box, so it is
///             always recoverable from the corners.
/// </remarks>
[DefaultDB, MigrationKey(20260825_1400)]
public class DefaultDB_20260825_1400_CostingPartBalloonAreas : Migration
{
    public override void Up()
    {
        Create.Table("CostingPartBalloonAreas")
            .WithColumn("ID").AsInt32().Identity().PrimaryKey().NotNullable()
            .WithColumn("CostingPartID").AsInt32().NotNullable()
                .ForeignKey("FK_CostingPartBalloonAreas_CostingPartID",
                            "CostingParts", "ID")
            // 1-based, as in CostingPartBalloons and the mask zones.
            .WithColumn("PageNumber").AsInt32().NotNullable()
            // Which area is numbered first. 1-based and dense per page.
            .WithColumn("OrderIndex").AsInt32().NotNullable()
            .WithColumn("AreaX1").AsDecimal(18, 6).NotNullable()
            .WithColumn("AreaY1").AsDecimal(18, 6).NotNullable()
            .WithColumn("AreaX2").AsDecimal(18, 6).NotNullable()
            .WithColumn("AreaY2").AsDecimal(18, 6).NotNullable()
            // One of the nine sort modes: partition, left_to_right,
            // right_to_left, top_to_bottom, bottom_to_top, reading_order,
            // clockwise, counterclockwise, polar_sweep. Held as text rather
            // than an enum so a mode added later needs no migration, and so a
            // project saved under a retired mode still opens - the client maps
            // the two retired ones onto reading order.
            .WithColumn("SortMode").AsString(40).NotNullable()
                .WithDefaultValue("partition")
            // Degrees clockwise from 12 o'clock. Only polar_sweep reads it.
            .WithColumn("StartAngle").AsInt32().NotNullable().WithDefaultValue(0)
            // Null falls back to "Area {OrderIndex}", so a row written without
            // one still labels itself.
            .WithColumn("Label").AsString(100).Nullable()
            .WithColumn("InsertDate").AsDateTime().NotNullable()
            .WithColumn("InsertUserId").AsInt32().NotNullable()
            .WithColumn("UpdateDate").AsDateTime().Nullable()
            .WithColumn("UpdateUserId").AsInt32().Nullable()
            .WithColumn("DeleteDate").AsDateTime().Nullable()
            .WithColumn("DeleteUserId").AsInt32().Nullable()
            .WithColumn("IsActive").AsInt16().NotNullable().WithDefaultValue(1);

        // Every read is "the areas on this page of this part, in order", which
        // is exactly this index.
        Create.Index("IX_CostingPartBalloonAreas_Part_Page")
            .OnTable("CostingPartBalloonAreas")
            .OnColumn("CostingPartID").Ascending()
            .OnColumn("PageNumber").Ascending()
            .OnColumn("OrderIndex").Ascending();
    }

    public override void Down()
    {
        Delete.Table("CostingPartBalloonAreas");
    }
}
