using Serenity.ComponentModel;
using System;

namespace DSRFQ.Material.Forms;

[FormScript("Material.RawMaterialCosts")]
[BasedOnRow(typeof(RawMaterialCostsRow), CheckNames = true)]
public class RawMaterialCostsForm
{
    [OneThirdWidth(UntilNext = true)]
    public int MaterialId { get; set; }
    public int MaterialTemperId { get; set; }
    public int WeightDimensionUnitId { get; set; }
    [HalfWidth(UntilNext = true)]
    public int CurrencyId { get; set; }
    public decimal UnitPrice { get; set; }
    
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public int CompanyId { get; set; }
    public int GroupId { get; set; }
    
}