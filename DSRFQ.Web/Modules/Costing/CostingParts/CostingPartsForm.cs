using Serenity.ComponentModel;
using System;

namespace DSRFQ.Costing.Forms;

[FormScript("Costing.CostingParts")]
[BasedOnRow(typeof(CostingPartsRow), CheckNames = true)]
public class CostingPartsForm
{
    [Hidden]
    public string PartNumber { get; set; }
    [Hidden]
    public string Revision { get; set; }
    [Hidden]
    public string Description { get; set; }
    [Hidden]
    public decimal Length { get; set; }
    [Hidden]
    public decimal Width { get; set; }
    [Hidden]
    public decimal Height { get; set; }
    [Hidden]
    public int DimensionUnitId { get; set; }
    [Hidden]
    public string PartPicture { get; set; }
    [Hidden]
    public int MaterialId { get; set; }
    [Hidden]
    public int MaterialTemperId { get; set; }
    [Hidden]
    public decimal GrossVolume { get; set; }
    [Hidden]
    public decimal NetVolume { get; set; }
    [Hidden]
    public int VolumeUnitId { get; set; }
    [Hidden]
    public decimal GrossWeight { get; set; }
    [Hidden]
    public decimal NetWeight { get; set; }
    [Hidden]
    public int WeightUnitId { get; set; }
    [Hidden]
    public int NumberOfFace { get; set; }
    [Hidden]
    public int NumberOfHole { get; set; }
    
}