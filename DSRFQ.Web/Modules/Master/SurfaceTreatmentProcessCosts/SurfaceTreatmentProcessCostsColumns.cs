using Serenity.ComponentModel;
using System;
using System.ComponentModel;

namespace DSRFQ.Master.Columns;

[ColumnsScript("Master.SurfaceTreatmentProcessCosts")]
[BasedOnRow(typeof(SurfaceTreatmentProcessCostsRow), CheckNames = true)]
public class SurfaceTreatmentProcessCostsColumns
{
    [EditLink, DisplayName("Db.Shared.RecordId"), AlignRight]
    public int Id { get; set; }
    public string DimensionUnitCode { get; set; }
    public decimal PricePerUnitArea { get; set; }
    public string CurrencyCode { get; set; }
    public bool Default { get; set; }
    public DateTime InsertDate { get; set; }
    public string InsertBy { get; set; }
    public DateTime UpdateDate { get; set; }
    public string UpdateBy { get; set; }
    public DateTime DeleteDate { get; set; }
    public string DeleteBy { get; set; }
}