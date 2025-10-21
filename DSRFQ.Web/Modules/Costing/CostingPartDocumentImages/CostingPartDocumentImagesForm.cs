using Serenity.ComponentModel;
using System;

namespace DSRFQ.Costing.Forms;

[FormScript("Costing.CostingPartDocumentImages")]
[BasedOnRow(typeof(CostingPartDocumentImagesRow), CheckNames = true)]
public class CostingPartDocumentImagesForm
{
    public int CostingPartDocumentId { get; set; }
    public string FileDirectory { get; set; }
    public string FileName { get; set; }
    public int Page { get; set; }
    
}