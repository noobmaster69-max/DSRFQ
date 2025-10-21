using Serenity.ComponentModel;
using System;

namespace DSRFQ.Costing.Forms;

[FormScript("Costing.CostingPartCostingResults")]
[BasedOnRow(typeof(CostingPartCostingResultsRow), CheckNames = true)]
public class CostingPartCostingResultsForm
{
    public int CostingPartId { get; set; }
    public int CostingCategoryId { get; set; }
    public string Name { get; set; }
    public string Description { get; set; }
    public decimal Quantity { get; set; }
    public int DimensionUnitId { get; set; }
    public string DimensionUnit { get; set; }
    public decimal UnitPrice { get; set; }
    public int CurrencyId { get; set; }
    public decimal Total { get; set; }
    public bool IsTimeUnit { get; set; }
    public bool IsManual { get; set; }
    
}