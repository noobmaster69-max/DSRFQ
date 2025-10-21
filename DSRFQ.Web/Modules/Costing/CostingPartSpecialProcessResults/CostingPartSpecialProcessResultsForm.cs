using Serenity.ComponentModel;
using System;

namespace DSRFQ.Costing.Forms;

[FormScript("Costing.CostingPartSpecialProcessResults")]
[BasedOnRow(typeof(CostingPartSpecialProcessResultsRow), CheckNames = true)]
public class CostingPartSpecialProcessResultsForm
{
    public int CostingPartId { get; set; }
    public string SpecialProcessName { get; set; }
    public int SpecialProcessId { get; set; }
    public bool IsManual { get; set; }
  
}