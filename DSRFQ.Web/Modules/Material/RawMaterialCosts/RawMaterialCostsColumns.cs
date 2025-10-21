using Serenity.ComponentModel;
using System;
using System.ComponentModel;

namespace DSRFQ.Material.Columns;

[ColumnsScript("Material.RawMaterialCosts")]
[BasedOnRow(typeof(RawMaterialCostsRow), CheckNames = true)]
public class RawMaterialCostsColumns
{
    [EditLink, DisplayName("Db.Shared.RecordId"), AlignRight]
    public int Id { get; set; }
    public string MaterialCode { get; set; }
    public int MaterialTemperId { get; set; }
    public string WeightDimensionUnitCode { get; set; }
    public string CurrencyCode { get; set; }
    public decimal UnitPrice { get; set; }
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
  
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