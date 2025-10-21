using Serenity.ComponentModel;
using System;

namespace DSRFQ.Master.Forms;

[FormScript("Master.CostingStatus")]
[BasedOnRow(typeof(CostingStatusRow), CheckNames = true)]
public class CostingStatusForm
{
    public string Name { get; set; }
    public string Color { get; set; }
   
}