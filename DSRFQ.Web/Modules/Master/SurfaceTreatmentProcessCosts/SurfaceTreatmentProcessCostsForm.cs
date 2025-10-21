using Serenity.ComponentModel;
using System;

namespace DSRFQ.Master.Forms;

[FormScript("Master.SurfaceTreatmentProcessCosts")]
[BasedOnRow(typeof(SurfaceTreatmentProcessCostsRow), CheckNames = true)]
public class SurfaceTreatmentProcessCostsForm
{
    [OneThirdWidth(UntilNext = true)]

    public int DimensionUnitId { get; set; }
    public decimal PricePerUnitArea { get; set; }
    public bool Default { get; set; }
    
}