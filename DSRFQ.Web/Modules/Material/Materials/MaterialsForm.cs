using Serenity.ComponentModel;
using System;

namespace DSRFQ.Material.Forms;

[FormScript("Material.Materials")]
[BasedOnRow(typeof(MaterialsRow), CheckNames = true)]
public class MaterialsForm
{
    [HalfWidth(UntilNext = true)]
    public string Code { get; set; }
    public string Name { get; set; }
    public string Description { get; set; }
    public decimal Density { get; set; }
    public int DimensionUnitId { get; set; }
    public int CompanyId { get; set; }
    
}