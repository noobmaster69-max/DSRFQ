using Serenity.ComponentModel;
using System;
using System.ComponentModel;

namespace DSRFQ.Costing.Columns;

[ColumnsScript("Costing.CostingPartBomResults")]
[BasedOnRow(typeof(CostingPartBomResultsRow), CheckNames = true)]
public class CostingPartBomResultsColumns
{
    [EditLink, DisplayName("Db.Shared.RecordId"), AlignRight]
    public int Id { get; set; }
    public string CostingPartPartNumber { get; set; }
    [EditLink]
    public string PartNumber { get; set; }
    public string Description { get; set; }
    public decimal Quantity { get; set; }
    public string InternalEngineeringNumber { get; set; }
    public int IsManual { get; set; }
    [DateTimeFormatter(DisplayFormat = "yyyy-MM-dd HH:mm"), Width(120)]

    public DateTime InsertDate { get; set; }
    public string InsertBy { get; set; }
    [DateTimeFormatter(DisplayFormat = "yyyy-MM-dd HH:mm"), Width(120)]
    public DateTime UpdateDate { get; set; }
    public string UpdateBy { get; set; }
    [DateTimeFormatter(DisplayFormat = "yyyy-MM-dd HH:mm"), Width(120)]
    public DateTime DeleteDate { get; set; }
    public string DeleteBy { get; set; }
}