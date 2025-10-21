using Serenity.ComponentModel;
using System;

namespace DSRFQ.Master.Forms;

[FormScript("Master.VolumeUnits")]
[BasedOnRow(typeof(VolumeUnitsRow), CheckNames = true)]
public class VolumeUnitsForm
{
    public string Code { get; set; }
    public string Name { get; set; }
  
}