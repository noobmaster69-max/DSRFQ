using Serenity.ComponentModel;
using System;

namespace DSRFQ.Costing.Forms;

[FormScript("Costing.CostingPartDocuments")]
[BasedOnRow(typeof(CostingPartDocumentsRow), CheckNames = true)]
public class CostingPartDocumentsForm
{
    public int CostingPartId { get; set; }
    public string FileDirectory { get; set; }
    public string ConvertedFileDirectory { get; set; }
    public string FileName { get; set; }
    public int Type { get; set; }
    
}