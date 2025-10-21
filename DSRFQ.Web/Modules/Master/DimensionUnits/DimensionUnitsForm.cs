using Serenity.ComponentModel;
using System;

namespace DSRFQ.Master.Forms;

[FormScript("Master.DimensionUnits")]
[BasedOnRow(typeof(DimensionUnitsRow), CheckNames = true)]
public class DimensionUnitsForm
{
    public string Code { get; set; }
    public string Name { get; set; }
   
}