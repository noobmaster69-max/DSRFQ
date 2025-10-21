using Serenity.ComponentModel;
using System;
using System.ComponentModel;

namespace DSRFQ.Costing.Columns;

[ColumnsScript("Costing.CostingPartDocumentImages")]
[BasedOnRow(typeof(CostingPartDocumentImagesRow), CheckNames = true)]
public class CostingPartDocumentImagesColumns
{
    [EditLink, DisplayName("Db.Shared.RecordId"), AlignRight]
    public int Id { get; set; }
    public string CostingPartDocumentFileDirectory { get; set; }
    [EditLink]
    public string FileDirectory { get; set; }
    public string FileName { get; set; }
    public int Page { get; set; }
  
}