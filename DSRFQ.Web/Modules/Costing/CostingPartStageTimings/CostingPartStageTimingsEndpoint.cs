using Microsoft.AspNetCore.Mvc;
using Serenity.Data;
using Serenity.Services;
using Serenity.Web;
using System.Data;
using MyRow = DSRFQ.Costing.CostingPartStageTimingsRow;

namespace DSRFQ.Costing.Endpoints;

/// <summary>
/// Read-only: the RFQ consumer owns these rows, the application only displays
/// them, so no Create/Update/Delete is exposed.
/// </summary>
[Route("Services/Costing/CostingPartStageTimings/[action]")]
[ConnectionKey(typeof(MyRow)), ServiceAuthorize(typeof(MyRow))]
public class CostingPartStageTimingsEndpoint : ServiceEndpoint
{
    [HttpPost]
    public RetrieveResponse<MyRow> Retrieve(IDbConnection connection, RetrieveRequest request,
        [FromServices] ICostingPartStageTimingsRetrieveHandler handler)
    {
        return handler.Retrieve(connection, request);
    }

    [HttpPost, AuthorizeList(typeof(MyRow))]
    public ListResponse<MyRow> List(IDbConnection connection, ListRequest request,
        [FromServices] ICostingPartStageTimingsListHandler handler)
    {
        return handler.List(connection, request);
    }
}
