using Serenity.ComponentModel;
using System;

namespace DSRFQ.Machines.Forms;

[FormScript("Machines.Machines")]
[BasedOnRow(typeof(MachinesRow), CheckNames = true)]
public class MachinesForm
{
    public string Name { get; set; }
    [HalfWidth(UntilNext = true)]
    public string Description { get; set; }
    public decimal Precision { get; set; }
    public int AxisNumber { get; set; }
    public decimal WeightLimit { get; set; }
    public decimal Cost { get; set; }
    public int CurrencyId { get; set; }
    [OneThirdWidth(UntilNext = true)]
    public decimal WorkEnvelopeX { get; set; }
    public decimal WorkEnvelopeY { get; set; }
    public decimal WorkEnvelopeZ { get; set; }
    
    
    
}