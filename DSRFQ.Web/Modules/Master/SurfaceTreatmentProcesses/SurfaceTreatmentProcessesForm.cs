using Serenity.ComponentModel;
using System;

namespace DSRFQ.Master.Forms;

[FormScript("Master.SurfaceTreatmentProcesses")]
[BasedOnRow(typeof(SurfaceTreatmentProcessesRow), CheckNames = true)]
public class SurfaceTreatmentProcessesForm
{
    
    public string Name { get; set; }
    public string Description { get; set; }
    [HalfWidth(UntilNext = true)]
    public string SpecificationNumber { get; set; }
    public bool Capable { get; set; }

    public string Comments { get; set; }
    public string Restriction { get; set; }
    
    public string SupplierName { get; set; }
    
    public string Country { get; set; }
    public string State { get; set; }
    public string City { get; set; }
    public DateOnly DateApprove { get; set; }
    public DateOnly DateExpire { get; set; }
    public int CompanyId { get; set; }
    [FullWidth]
    [SurfaceTreatmentProcessCostsEditor]
    public List<SurfaceTreatmentProcessCostsRow> CostItems { get; set; }
}