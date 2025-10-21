using Serenity.ComponentModel;
using System;
using System.ComponentModel;

namespace DSRFQ.Costing.Columns;

[ColumnsScript("Costing.CostingPartDocuments")]
[BasedOnRow(typeof(CostingPartDocumentsRow), CheckNames = true)]
public class CostingPartDocumentsColumns
{
    [EditLink, DisplayName("Db.Shared.RecordId"), AlignRight]
    public int Id { get; set; }
    public string CostingPartPartNumber { get; set; }
    [EditLink]
    public string FileDirectory { get; set; }
    public string FileName { get; set; }
    public int Type { get; set; }
    
}