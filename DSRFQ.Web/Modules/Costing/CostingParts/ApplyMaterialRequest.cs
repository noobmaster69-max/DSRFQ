using Serenity.Services;

namespace DSRFQ.Costing;

/// <summary>
/// Price one part as a given material, or as no material at all.
/// </summary>
public class ApplyMaterialRequest : ServiceRequest
{
    public int CostingPartId { get; set; }

    /// <summary>
    /// The chosen material, or null to clear it.
    /// </summary>
    /// <remarks>
    /// Nullable on purpose. A drawing that says "SEE BOM" names no single
    /// material, and the operator has to be able to put the part back to that
    /// rather than being forced to leave a wrong one in place.
    /// </remarks>
    public int? MaterialId { get; set; }
}

public class ApplyMaterialResponse : ServiceResponse
{
    /// <summary>Weight the material line was quoted on, recomputed from volume x density.</summary>
    public decimal? GrossWeight { get; set; }

    /// <summary>Finished weight, recomputed alongside it. Not what the quote uses.</summary>
    public decimal? NetWeight { get; set; }

    /// <summary>Raw material rate per unit weight.</summary>
    public decimal? UnitPrice { get; set; }

    /// <summary>The material line's own total.</summary>
    public decimal? Total { get; set; }

    /// <summary>Every active line on the part, so the header can update without a reload.</summary>
    public decimal? PartTotal { get; set; }

    public string Message { get; set; }
}
