using Serenity.ComponentModel;
using System;
using System.ComponentModel;

namespace DSRFQ.Machines.Columns;

[ColumnsScript("Machines.Machines")]
[BasedOnRow(typeof(MachinesRow), CheckNames = true)]
public class MachinesColumns
{
    [EditLink, DisplayName("Db.Shared.RecordId"), AlignRight,SortOrder(1,true)]
    public long Id { get; set; }
    [EditLink]
    public string Name { get; set; }
    public string Description { get; set; }
    public decimal Precision { get; set; }
    public int AxisNumber { get; set; }
    public decimal Cost { get; set; }
    public string CurrencyCode { get; set; }
    public decimal WorkEnvelopeX { get; set; }
    public decimal WorkEnvelopeY { get; set; }
    public decimal WorkEnvelopeZ { get; set; }
    public decimal WeightLimit { get; set; }
    
    public string CompanyName { get; set; }
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