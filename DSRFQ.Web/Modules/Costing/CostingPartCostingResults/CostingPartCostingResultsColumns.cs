using Serenity.ComponentModel;
using System;
using System.ComponentModel;

namespace DSRFQ.Costing.Columns;

[ColumnsScript("Costing.CostingPartCostingResults")]
[BasedOnRow(typeof(CostingPartCostingResultsRow), CheckNames = true)]
public class CostingPartCostingResultsColumns
{
    [EditLink, DisplayName("Db.Shared.RecordId"), AlignRight]
    public int Id { get; set; }
    public string CostingPartPartNumber { get; set; }
    public int CostingCategoryId { get; set; }
    [EditLink]
    public string Name { get; set; }
    public string Description { get; set; }
    public decimal Quantity { get; set; }
    public string DimensionUnitCode { get; set; }
    public string DimensionUnit { get; set; }
    public decimal UnitPrice { get; set; }
    public string CurrencyCode { get; set; }
    public decimal Total { get; set; }
    public bool IsTimeUnit { get; set; }
    public bool IsManual { get; set; }
    public DateTime InsertDate { get; set; }
    public string InsertBy { get; set; }
    public DateTime UpdateDate { get; set; }
    public string UpdateBy { get; set; }
    public DateTime DeleteDate { get; set; }
    public string DeleteBy { get; set; }
}