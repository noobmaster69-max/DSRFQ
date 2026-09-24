using Serenity.Services;

namespace DSRFQ.Costing;

public class BuildMachineOptionsRequest : ServiceRequest
{
    public int CostingPartId { get; set; }
    /// <summary>Rebuild even when options already exist, e.g. after a machine's rate changed.</summary>
    public bool Force { get; set; }
}

public class BuildMachineOptionsResponse : ServiceResponse
{
    public int Lines { get; set; }
    public int Options { get; set; }
    public string Message { get; set; }
}

public class ApplyMachineRequest : ServiceRequest
{
    /// <summary>The cost line to re-price.</summary>
    public int CostingPartCostingResultId { get; set; }
    public int MachineId { get; set; }
}

public class ApplyMachineResponse : ServiceResponse
{
    public decimal? UnitPrice { get; set; }
    public decimal? Total { get; set; }
    /// <summary>New total for the whole part, so the header can update without a reload.</summary>
    public decimal? PartTotal { get; set; }
    public string Message { get; set; }
}
