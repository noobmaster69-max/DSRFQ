using Serenity.ComponentModel;
using System;

namespace DSRFQ.Master.Forms;

/// <summary>
/// The coordinate fields are [Hidden] on purpose: they are written by dragging
/// boxes on the canvas in ToolTemplateConversionDialog, not typed by hand. They
/// stay on the form so the dialog has editors to push the drawn values into.
/// </summary>
[FormScript("Master.ToolTemplateConversion")]
[BasedOnRow(typeof(ToolTemplateConversionRow), CheckNames = true)]
public class ToolTemplateConversionForm
{
    public string Name { get; set; }
    public string ReplacementText { get; set; }
    [HalfWidth]
    public string LogoPicture { get; set; }
    [HalfWidth]
    public string TablePicture { get; set; }
    public bool Default { get; set; }

    [Hidden] public decimal RevisionX1 { get; set; }
    [Hidden] public decimal RevisionY1 { get; set; }
    [Hidden] public decimal RevisionX2 { get; set; }
    [Hidden] public decimal RevisionY2 { get; set; }

    [Hidden] public decimal PartNumberX1 { get; set; }
    [Hidden] public decimal PartNumberY1 { get; set; }
    [Hidden] public decimal PartNumberX2 { get; set; }
    [Hidden] public decimal PartNumberY2 { get; set; }

    [Hidden] public decimal DescriptionX1 { get; set; }
    [Hidden] public decimal DescriptionY1 { get; set; }
    [Hidden] public decimal DescriptionX2 { get; set; }
    [Hidden] public decimal DescriptionY2 { get; set; }

    [Hidden] public decimal MaterialX1 { get; set; }
    [Hidden] public decimal MaterialY1 { get; set; }
    [Hidden] public decimal MaterialX2 { get; set; }
    [Hidden] public decimal MaterialY2 { get; set; }

    [Hidden] public decimal WeightX1 { get; set; }
    [Hidden] public decimal WeightY1 { get; set; }
    [Hidden] public decimal WeightX2 { get; set; }
    [Hidden] public decimal WeightY2 { get; set; }

    [Hidden] public decimal AngularToleranceX1 { get; set; }
    [Hidden] public decimal AngularToleranceY1 { get; set; }
    [Hidden] public decimal AngularToleranceX2 { get; set; }
    [Hidden] public decimal AngularToleranceY2 { get; set; }

    [Hidden] public decimal SurfaceX1 { get; set; }
    [Hidden] public decimal SurfaceY1 { get; set; }
    [Hidden] public decimal SurfaceX2 { get; set; }
    [Hidden] public decimal SurfaceY2 { get; set; }

    [Hidden] public decimal Tolerance1X1 { get; set; }
    [Hidden] public decimal Tolerance1Y1 { get; set; }
    [Hidden] public decimal Tolerance1X2 { get; set; }
    [Hidden] public decimal Tolerance1Y2 { get; set; }

    [Hidden] public decimal Tolerance2X1 { get; set; }
    [Hidden] public decimal Tolerance2Y1 { get; set; }
    [Hidden] public decimal Tolerance2X2 { get; set; }
    [Hidden] public decimal Tolerance2Y2 { get; set; }

    [Hidden] public decimal Tolerance3X1 { get; set; }
    [Hidden] public decimal Tolerance3Y1 { get; set; }
    [Hidden] public decimal Tolerance3X2 { get; set; }
    [Hidden] public decimal Tolerance3Y2 { get; set; }

    [Hidden] public decimal Tolerance4X1 { get; set; }
    [Hidden] public decimal Tolerance4Y1 { get; set; }
    [Hidden] public decimal Tolerance4X2 { get; set; }
    [Hidden] public decimal Tolerance4Y2 { get; set; }
}
