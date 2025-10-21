using Serenity.ComponentModel;
using System;
using System.ComponentModel;

namespace DSRFQ.Master.Columns;

[ColumnsScript("Master.SurfaceTreatmentProcesses")]
[BasedOnRow(typeof(SurfaceTreatmentProcessesRow), CheckNames = true)]
public class SurfaceTreatmentProcessesColumns
{
    [EditLink, DisplayName("Db.Shared.RecordId"), AlignRight]
    public int Id { get; set; }
    [EditLink]
    public string Name { get; set; }
    public string Description { get; set; }
    public string SpecificationNumber { get; set; }
    public string Comments { get; set; }
    public string Restriction { get; set; }
    public string SupplierName { get; set; }
    public string Country { get; set; }
    public string State { get; set; }
    public string City { get; set; }
    public DateOnly DateApprove { get; set; }
    public DateOnly DateExpire { get; set; }
    public bool Capable { get; set; }
    public DateTime InsertDate { get; set; }
    public string InsertBy { get; set; }
    public DateTime UpdateDate { get; set; }
    public string UpdateBy { get; set; }
    public DateTime DeleteDate { get; set; }
    public string DeleteBy { get; set; }
}