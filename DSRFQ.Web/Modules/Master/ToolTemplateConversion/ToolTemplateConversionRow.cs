using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;
using DSRFQ.Modules.Common.Permissions;

namespace DSRFQ.Master;

/// <summary>
/// A drawing-conversion template: the artwork stamped onto a converted drawing,
/// plus where each title-block value is written on it.
///
/// This is the database form of what the RFQ pipeline hardcoded in function.py
/// as TABLE_PATH, ICON_PATH and TEMPLATE_COORDS. The X1/Y1/X2/Y2 quads are
/// pixel coordinates in the TablePicture's own resolution, which is what
/// DrawingConversion.generate_filled_template expects for its coords argument.
/// </summary>
[ConnectionKey("Default"), Module("Master"), TableName("ToolTemplateConversion")]
[DisplayName("Drawing Conversion Template"), InstanceName("Drawing Conversion Template")]
[NavigationPermission(MasterPermissionKeys.MasterToolTemplateNavigation)]
[ReadPermission(MasterPermissionKeys.MasterToolTemplateView)]
[DeletePermission(MasterPermissionKeys.MasterToolTemplateDelete)]
[UpdatePermission(MasterPermissionKeys.MasterToolTemplateUpdate)]
[InsertPermission(MasterPermissionKeys.MasterToolTemplateInsert)]
[ServiceLookupPermission("?")]
[LookupScript("ToolTemplateConversion", Permission = "?")]
public sealed class ToolTemplateConversionRow : LoggingRow<ToolTemplateConversionRow.RowFields>, IIdRow, INameRow
{
    [DisplayName("Id"), Column("ID"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Name"), QuickSearch, NameProperty]
    public string Name { get => fields.Name[this]; set => fields.Name[this] = value; }

    [DisplayName("Logo"), Column("LogoPicture"), ImageUploadEditor(FilenameFormat = "ToolTemplateConversion/Logo/~")]
    public string LogoPicture { get => fields.LogoPicture[this]; set => fields.LogoPicture[this] = value; }

    [DisplayName("Table"), Column("TablePicture"), ImageUploadEditor(FilenameFormat = "ToolTemplateConversion/Table/~")]
    public string TablePicture { get => fields.TablePicture[this]; set => fields.TablePicture[this] = value; }

    /// <summary>
    /// The word written over the customer's name on the converted drawing.
    /// </summary>
    /// <remarks>
    /// Was hardcoded as "TSH" in the consumer. Left blank, the consumer still
    /// uses "TSH", so a template nobody has edited behaves as before.
    /// </remarks>
    [DisplayName("Replace With"), Size(100),
     Placeholder("TSH"),
     Hint("The word stamped over the customer's name on the converted drawing. Leave blank for TSH.")]
    public string ReplacementText { get => fields.ReplacementText[this]; set => fields.ReplacementText[this] = value; }

    [DisplayName("Revision X1"), Size(20), Scale(2)]
    public decimal? RevisionX1 { get => fields.RevisionX1[this]; set => fields.RevisionX1[this] = value; }
    [DisplayName("Revision Y1"), Size(20), Scale(2)]
    public decimal? RevisionY1 { get => fields.RevisionY1[this]; set => fields.RevisionY1[this] = value; }
    [DisplayName("Revision X2"), Size(20), Scale(2)]
    public decimal? RevisionX2 { get => fields.RevisionX2[this]; set => fields.RevisionX2[this] = value; }
    [DisplayName("Revision Y2"), Size(20), Scale(2)]
    public decimal? RevisionY2 { get => fields.RevisionY2[this]; set => fields.RevisionY2[this] = value; }
    [DisplayName("Part Number X1"), Size(20), Scale(2)]
    public decimal? PartNumberX1 { get => fields.PartNumberX1[this]; set => fields.PartNumberX1[this] = value; }
    [DisplayName("Part Number Y1"), Size(20), Scale(2)]
    public decimal? PartNumberY1 { get => fields.PartNumberY1[this]; set => fields.PartNumberY1[this] = value; }
    [DisplayName("Part Number X2"), Size(20), Scale(2)]
    public decimal? PartNumberX2 { get => fields.PartNumberX2[this]; set => fields.PartNumberX2[this] = value; }
    [DisplayName("Part Number Y2"), Size(20), Scale(2)]
    public decimal? PartNumberY2 { get => fields.PartNumberY2[this]; set => fields.PartNumberY2[this] = value; }
    [DisplayName("Description X1"), Size(20), Scale(2)]
    public decimal? DescriptionX1 { get => fields.DescriptionX1[this]; set => fields.DescriptionX1[this] = value; }
    [DisplayName("Description Y1"), Size(20), Scale(2)]
    public decimal? DescriptionY1 { get => fields.DescriptionY1[this]; set => fields.DescriptionY1[this] = value; }
    [DisplayName("Description X2"), Size(20), Scale(2)]
    public decimal? DescriptionX2 { get => fields.DescriptionX2[this]; set => fields.DescriptionX2[this] = value; }
    [DisplayName("Description Y2"), Size(20), Scale(2)]
    public decimal? DescriptionY2 { get => fields.DescriptionY2[this]; set => fields.DescriptionY2[this] = value; }
    [DisplayName("Material X1"), Size(20), Scale(2)]
    public decimal? MaterialX1 { get => fields.MaterialX1[this]; set => fields.MaterialX1[this] = value; }
    [DisplayName("Material Y1"), Size(20), Scale(2)]
    public decimal? MaterialY1 { get => fields.MaterialY1[this]; set => fields.MaterialY1[this] = value; }
    [DisplayName("Material X2"), Size(20), Scale(2)]
    public decimal? MaterialX2 { get => fields.MaterialX2[this]; set => fields.MaterialX2[this] = value; }
    [DisplayName("Material Y2"), Size(20), Scale(2)]
    public decimal? MaterialY2 { get => fields.MaterialY2[this]; set => fields.MaterialY2[this] = value; }
    [DisplayName("Weight X1"), Size(20), Scale(2)]
    public decimal? WeightX1 { get => fields.WeightX1[this]; set => fields.WeightX1[this] = value; }
    [DisplayName("Weight Y1"), Size(20), Scale(2)]
    public decimal? WeightY1 { get => fields.WeightY1[this]; set => fields.WeightY1[this] = value; }
    [DisplayName("Weight X2"), Size(20), Scale(2)]
    public decimal? WeightX2 { get => fields.WeightX2[this]; set => fields.WeightX2[this] = value; }
    [DisplayName("Weight Y2"), Size(20), Scale(2)]
    public decimal? WeightY2 { get => fields.WeightY2[this]; set => fields.WeightY2[this] = value; }
    [DisplayName("Angular Tolerance X1"), Size(20), Scale(2)]
    public decimal? AngularToleranceX1 { get => fields.AngularToleranceX1[this]; set => fields.AngularToleranceX1[this] = value; }
    [DisplayName("Angular Tolerance Y1"), Size(20), Scale(2)]
    public decimal? AngularToleranceY1 { get => fields.AngularToleranceY1[this]; set => fields.AngularToleranceY1[this] = value; }
    [DisplayName("Angular Tolerance X2"), Size(20), Scale(2)]
    public decimal? AngularToleranceX2 { get => fields.AngularToleranceX2[this]; set => fields.AngularToleranceX2[this] = value; }
    [DisplayName("Angular Tolerance Y2"), Size(20), Scale(2)]
    public decimal? AngularToleranceY2 { get => fields.AngularToleranceY2[this]; set => fields.AngularToleranceY2[this] = value; }
    [DisplayName("Surface X1"), Size(20), Scale(2)]
    public decimal? SurfaceX1 { get => fields.SurfaceX1[this]; set => fields.SurfaceX1[this] = value; }
    [DisplayName("Surface Y1"), Size(20), Scale(2)]
    public decimal? SurfaceY1 { get => fields.SurfaceY1[this]; set => fields.SurfaceY1[this] = value; }
    [DisplayName("Surface X2"), Size(20), Scale(2)]
    public decimal? SurfaceX2 { get => fields.SurfaceX2[this]; set => fields.SurfaceX2[this] = value; }
    [DisplayName("Surface Y2"), Size(20), Scale(2)]
    public decimal? SurfaceY2 { get => fields.SurfaceY2[this]; set => fields.SurfaceY2[this] = value; }
    [DisplayName("Tolerance 1 X1"), Size(20), Scale(2)]
    public decimal? Tolerance1X1 { get => fields.Tolerance1X1[this]; set => fields.Tolerance1X1[this] = value; }
    [DisplayName("Tolerance 1 Y1"), Size(20), Scale(2)]
    public decimal? Tolerance1Y1 { get => fields.Tolerance1Y1[this]; set => fields.Tolerance1Y1[this] = value; }
    [DisplayName("Tolerance 1 X2"), Size(20), Scale(2)]
    public decimal? Tolerance1X2 { get => fields.Tolerance1X2[this]; set => fields.Tolerance1X2[this] = value; }
    [DisplayName("Tolerance 1 Y2"), Size(20), Scale(2)]
    public decimal? Tolerance1Y2 { get => fields.Tolerance1Y2[this]; set => fields.Tolerance1Y2[this] = value; }
    [DisplayName("Tolerance 2 X1"), Size(20), Scale(2)]
    public decimal? Tolerance2X1 { get => fields.Tolerance2X1[this]; set => fields.Tolerance2X1[this] = value; }
    [DisplayName("Tolerance 2 Y1"), Size(20), Scale(2)]
    public decimal? Tolerance2Y1 { get => fields.Tolerance2Y1[this]; set => fields.Tolerance2Y1[this] = value; }
    [DisplayName("Tolerance 2 X2"), Size(20), Scale(2)]
    public decimal? Tolerance2X2 { get => fields.Tolerance2X2[this]; set => fields.Tolerance2X2[this] = value; }
    [DisplayName("Tolerance 2 Y2"), Size(20), Scale(2)]
    public decimal? Tolerance2Y2 { get => fields.Tolerance2Y2[this]; set => fields.Tolerance2Y2[this] = value; }
    [DisplayName("Tolerance 3 X1"), Size(20), Scale(2)]
    public decimal? Tolerance3X1 { get => fields.Tolerance3X1[this]; set => fields.Tolerance3X1[this] = value; }
    [DisplayName("Tolerance 3 Y1"), Size(20), Scale(2)]
    public decimal? Tolerance3Y1 { get => fields.Tolerance3Y1[this]; set => fields.Tolerance3Y1[this] = value; }
    [DisplayName("Tolerance 3 X2"), Size(20), Scale(2)]
    public decimal? Tolerance3X2 { get => fields.Tolerance3X2[this]; set => fields.Tolerance3X2[this] = value; }
    [DisplayName("Tolerance 3 Y2"), Size(20), Scale(2)]
    public decimal? Tolerance3Y2 { get => fields.Tolerance3Y2[this]; set => fields.Tolerance3Y2[this] = value; }
    [DisplayName("Tolerance 4 X1"), Size(20), Scale(2)]
    public decimal? Tolerance4X1 { get => fields.Tolerance4X1[this]; set => fields.Tolerance4X1[this] = value; }
    [DisplayName("Tolerance 4 Y1"), Size(20), Scale(2)]
    public decimal? Tolerance4Y1 { get => fields.Tolerance4Y1[this]; set => fields.Tolerance4Y1[this] = value; }
    [DisplayName("Tolerance 4 X2"), Size(20), Scale(2)]
    public decimal? Tolerance4X2 { get => fields.Tolerance4X2[this]; set => fields.Tolerance4X2[this] = value; }
    [DisplayName("Tolerance 4 Y2"), Size(20), Scale(2)]
    public decimal? Tolerance4Y2 { get => fields.Tolerance4Y2[this]; set => fields.Tolerance4Y2[this] = value; }

    /// <summary>
    /// The template the pipeline uses when a costing part does not name one.
    /// Exactly one active row may carry it: the save handler clears the previous
    /// default rather than letting the unique filtered index reject the save.
    /// </summary>
    [DisplayName("Default"), BooleanEditor]
    public bool? Default { get => fields.Default[this]; set => fields.Default[this] = value; }

    public class RowFields : LoggingRowFields
    {
        public Int32Field Id;
        public StringField Name;
        public StringField LogoPicture;
        public StringField TablePicture;
        public StringField ReplacementText;
        public DecimalField RevisionX1;
        public DecimalField RevisionY1;
        public DecimalField RevisionX2;
        public DecimalField RevisionY2;
        public DecimalField PartNumberX1;
        public DecimalField PartNumberY1;
        public DecimalField PartNumberX2;
        public DecimalField PartNumberY2;
        public DecimalField DescriptionX1;
        public DecimalField DescriptionY1;
        public DecimalField DescriptionX2;
        public DecimalField DescriptionY2;
        public DecimalField MaterialX1;
        public DecimalField MaterialY1;
        public DecimalField MaterialX2;
        public DecimalField MaterialY2;
        public DecimalField WeightX1;
        public DecimalField WeightY1;
        public DecimalField WeightX2;
        public DecimalField WeightY2;
        public DecimalField AngularToleranceX1;
        public DecimalField AngularToleranceY1;
        public DecimalField AngularToleranceX2;
        public DecimalField AngularToleranceY2;
        public DecimalField SurfaceX1;
        public DecimalField SurfaceY1;
        public DecimalField SurfaceX2;
        public DecimalField SurfaceY2;
        public DecimalField Tolerance1X1;
        public DecimalField Tolerance1Y1;
        public DecimalField Tolerance1X2;
        public DecimalField Tolerance1Y2;
        public DecimalField Tolerance2X1;
        public DecimalField Tolerance2Y1;
        public DecimalField Tolerance2X2;
        public DecimalField Tolerance2Y2;
        public DecimalField Tolerance3X1;
        public DecimalField Tolerance3Y1;
        public DecimalField Tolerance3X2;
        public DecimalField Tolerance3Y2;
        public DecimalField Tolerance4X1;
        public DecimalField Tolerance4Y1;
        public DecimalField Tolerance4X2;
        public DecimalField Tolerance4Y2;
        public BooleanField Default;
    }
}
