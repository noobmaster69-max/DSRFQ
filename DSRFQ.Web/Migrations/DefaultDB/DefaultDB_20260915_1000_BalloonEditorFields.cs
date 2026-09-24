using FluentMigrator;

namespace DSRFQ.Migrations.DefaultDB;

/// <summary>
/// What One Supply keeps per balloon, per page and per shop that DSRFQ did not.
/// </summary>
/// <remarks>
/// Every new balloon column is nullable or has a default, because the RFQ
/// consumer inserts CostingPartBalloons with an explicit column list and must
/// keep working unchanged. Null means "the shop default" throughout: a balloon
/// nobody restyled follows BubbleStyleJson, rather than having today's default
/// frozen into every row.
///
/// Per balloon:
///   Audited / AuditedOn / AuditedBy - One Supply's 审核 (F2) review mark.
///   BalloonShape, BalloonLineWidth, BalloonStyle, TextColor, ShowArrow,
///   BalloonScale - per-balloon appearance (its right-click menu). BalloonColor
///   already existed but was written as a constant.
///   BoxHidden - hide the recognition box but keep the balloon.
///   DimensionFeature - "theoretical" (basic) or "reference"; null = normal.
///   NumberCategory - One Supply's 序号排列 partition (Notes, EQN, BOM, ...).
///   ExportMode - "text" or "screenshot": which a report shows for it.
///   CropRotation - degrees the list/report crop is turned.
///
/// Per page, on the grid table since it is already one row per page:
///   Rotation - the page view turned 0/90/180/270.
///   FrameX1..FrameY2 - the drawing border the grid divides, page percent.
///
/// Per shop, on MasterSettings: JSON blobs owned by the widget's dialogs.
/// </remarks>
[DefaultDB, MigrationKey(20260915_1000)]
public class DefaultDB_20260915_1000_BalloonEditorFields : Migration
{
    public override void Up()
    {
        Alter.Table("CostingPartBalloons")
            .AddColumn("Audited").AsBoolean().NotNullable().WithDefaultValue(false)
            .AddColumn("AuditedOn").AsDateTime().Nullable()
            .AddColumn("AuditedBy").AsString(100).Nullable()
            .AddColumn("BalloonShape").AsString(20).Nullable()
            .AddColumn("BalloonLineWidth").AsInt32().Nullable()
            .AddColumn("BalloonStyle").AsString(20).Nullable()
            .AddColumn("TextColor").AsString(20).Nullable()
            .AddColumn("ShowArrow").AsBoolean().Nullable()
            .AddColumn("BalloonScale").AsDecimal(8, 3).Nullable()
            .AddColumn("BoxHidden").AsBoolean().NotNullable().WithDefaultValue(false)
            .AddColumn("DimensionFeature").AsString(20).Nullable()
            .AddColumn("NumberCategory").AsString(40).Nullable()
            .AddColumn("ExportMode").AsString(20).Nullable()
            .AddColumn("CropRotation").AsInt32().Nullable();

        // The constant the widget used to write, so a restyled default can
        // tell "never chosen" from "chosen green".
        Execute.Sql("UPDATE dbo.CostingPartBalloons SET BalloonColor = NULL WHERE BalloonColor = '#27dc3c';");

        Alter.Table("CostingPartBalloonGrids")
            .AddColumn("Rotation").AsInt32().Nullable()
            .AddColumn("FrameX1").AsDecimal(9, 4).Nullable()
            .AddColumn("FrameY1").AsDecimal(9, 4).Nullable()
            .AddColumn("FrameX2").AsDecimal(9, 4).Nullable()
            .AddColumn("FrameY2").AsDecimal(9, 4).Nullable();

        Alter.Table("MasterSettings")
            .AddColumn("BubbleStyleJson").AsString(int.MaxValue).Nullable()
            .AddColumn("PartitionOrderJson").AsString(int.MaxValue).Nullable()
            .AddColumn("SymbolFilterJson").AsString(int.MaxValue).Nullable()
            .AddColumn("PdfExportJson").AsString(int.MaxValue).Nullable()
            .AddColumn("EditorDefaultsJson").AsString(int.MaxValue).Nullable();
    }

    public override void Down()
    {
        foreach (var c in new[] { "Audited", "AuditedOn", "AuditedBy", "BalloonShape", "BalloonLineWidth",
                                  "BalloonStyle", "TextColor", "ShowArrow", "BalloonScale", "BoxHidden",
                                  "DimensionFeature", "NumberCategory", "ExportMode", "CropRotation" })
            Delete.Column(c).FromTable("CostingPartBalloons");
        foreach (var c in new[] { "Rotation", "FrameX1", "FrameY1", "FrameX2", "FrameY2" })
            Delete.Column(c).FromTable("CostingPartBalloonGrids");
        foreach (var c in new[] { "BubbleStyleJson", "PartitionOrderJson", "SymbolFilterJson",
                                  "PdfExportJson", "EditorDefaultsJson" })
            Delete.Column(c).FromTable("MasterSettings");
    }
}
