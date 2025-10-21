using Serenity.ComponentModel;
using System;

namespace DSRFQ.Costing.Forms;

[FormScript("Costing.CostingPartBomResults")]
[BasedOnRow(typeof(CostingPartBomResultsRow), CheckNames = true)]
public class CostingPartBomResultsForm
{
    public int CostingPartId { get; set; }
    public string PartNumber { get; set; }
    public string Description { get; set; }
    public decimal Quantity { get; set; }
    public string InternalEngineeringNumber { get; set; }
    public bool IsManual { get; set; }
}