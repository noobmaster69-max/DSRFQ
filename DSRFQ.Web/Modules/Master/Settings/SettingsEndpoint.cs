using Microsoft.AspNetCore.Mvc;
using Serenity.Data;
using Serenity.Services;
using Serenity.Web;
using System.Data;
using MyRow = DSRFQ.Master.SettingsRow;

namespace DSRFQ.Master.Endpoints;

/// <summary>
/// Read and update the single ballooning-settings row.
/// </summary>
/// <remarks>
/// No Create and no Delete: the row is seeded by the migration and there is
/// only ever one. Offering either would let a client leave the widget and the
/// RFQ consumer reading different rows, or none.
/// </remarks>
[Route("Services/Master/Settings/[action]")]
[ConnectionKey(typeof(MyRow)), ServiceAuthorize(typeof(MyRow))]
public class SettingsEndpoint : ServiceEndpoint
{
    [HttpPost, AuthorizeUpdate(typeof(MyRow))]
    public SaveResponse Update(IUnitOfWork uow, SaveRequest<MyRow> request,
        [FromServices] ISettingsSaveHandler handler)
    {
        return handler.Update(uow, request);
    }

    [HttpPost]
    public RetrieveResponse<MyRow> Retrieve(IDbConnection connection, RetrieveRequest request,
        [FromServices] ISettingsRetrieveHandler handler)
    {
        return handler.Retrieve(connection, request);
    }

    [HttpPost, AuthorizeList(typeof(MyRow))]
    public ListResponse<MyRow> List(IDbConnection connection, ListRequest request,
        [FromServices] ISettingsListHandler handler)
    {
        return handler.List(connection, request);
    }
}
