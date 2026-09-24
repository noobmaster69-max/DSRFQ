using FluentMigrator;

namespace DSRFQ.Migrations.DefaultDB;

/// <summary>
/// Section and detail views on a part's drawing, and where each was cut from.
/// </summary>
/// <remarks>
/// "SECTION A-A" is shown in one place and cut in another: two letters A at
/// the ends of a cutting-plane line, maybe on another sheet. The consumer
/// reads both off the PDF (RPA/RFQ/view_links.py) and writes one row per view
/// on every ballooning run, replacing the last run's - they are the drawing's,
/// not anybody's edits, so there is nothing to preserve.
///
/// All positions are percent of the page as displayed, the balloons' space.
/// The view rectangle is what places a balloon "in SECTION A-A"; the marks and
/// line are what the editor jumps to. MarksJson holds up to two rectangles,
/// [{"x1","y1","x2","y2"}], since a section has two letters and a detail one.
/// </remarks>
[DefaultDB, MigrationKey(20260921_1800)]
public class DefaultDB_20260921_1800_ViewLinks : Migration
{
    public override void Up()
    {
        Create.Table("CostingPartViewLinks")
            .WithColumn("Id").AsInt32().Identity().PrimaryKey().NotNullable()
            .WithColumn("CostingPartID").AsInt32().NotNullable().Indexed()
            .WithColumn("Kind").AsString(20).NotNullable()
            .WithColumn("Letter").AsString(4).NotNullable()
            .WithColumn("Title").AsString(40).NotNullable()
            .WithColumn("PageNumber").AsInt32().NotNullable()
            .WithColumn("LabelX1").AsDecimal(9, 3).Nullable()
            .WithColumn("LabelY1").AsDecimal(9, 3).Nullable()
            .WithColumn("LabelX2").AsDecimal(9, 3).Nullable()
            .WithColumn("LabelY2").AsDecimal(9, 3).Nullable()
            .WithColumn("ViewX1").AsDecimal(9, 3).Nullable()
            .WithColumn("ViewY1").AsDecimal(9, 3).Nullable()
            .WithColumn("ViewX2").AsDecimal(9, 3).Nullable()
            .WithColumn("ViewY2").AsDecimal(9, 3).Nullable()
            .WithColumn("MarkPageNumber").AsInt32().Nullable()
            .WithColumn("MarksJson").AsString(int.MaxValue).Nullable()
            .WithColumn("LineX1").AsDecimal(9, 3).Nullable()
            .WithColumn("LineY1").AsDecimal(9, 3).Nullable()
            .WithColumn("LineX2").AsDecimal(9, 3).Nullable()
            .WithColumn("LineY2").AsDecimal(9, 3).Nullable()
            .WithColumn("InsertDate").AsDateTime().Nullable();
    }

    public override void Down()
    {
        Delete.Table("CostingPartViewLinks");
    }
}
