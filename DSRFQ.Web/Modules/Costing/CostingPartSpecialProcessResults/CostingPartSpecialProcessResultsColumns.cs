using Serenity.ComponentModel;
using System;
using System.ComponentModel;

namespace DSRFQ.Costing.Columns;

[ColumnsScript("Costing.CostingPartSpecialProcessResults")]
[BasedOnRow(typeof(CostingPartSpecialProcessResultsRow), CheckNames = true)]
public class CostingPartSpecialProcessResultsColumns
{
    [EditLink, DisplayName("Db.Shared.RecordId"), AlignRight]
    public int Id { get; set; }
    public string CostingPartPartNumber { get; set; }
    [EditLink]
    public string SpecialProcessName { get; set; }
    public int SpecialProcessId { get; set; }
    public int IsManual { get; set; }
    public DateTime InsertDate { get; set; }
    public string InsertBy { get; set; }
    public DateTime UpdateDate { get; set; }
    public string UpdateBy { get; set; }
    public DateTime DeleteDate { get; set; }
    public string DeleteBy { get; set; }
}