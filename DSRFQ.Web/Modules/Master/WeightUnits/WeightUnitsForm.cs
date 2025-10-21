using Serenity.ComponentModel;
using System;

namespace DSRFQ.Master.Forms;

[FormScript("Master.WeightUnits")]
[BasedOnRow(typeof(WeightUnitsRow), CheckNames = true)]
public class WeightUnitsForm
{
    public string Code { get; set; }
    public string Name { get; set; }
   
}