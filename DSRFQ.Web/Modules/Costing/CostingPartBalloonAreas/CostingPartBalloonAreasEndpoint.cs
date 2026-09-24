using Microsoft.AspNetCore.Mvc;
using Serenity.Data;
using Serenity.Services;
using System.Data;
using MyRow = DSRFQ.Costing.CostingPartBalloonAreasRow;

namespace DSRFQ.Costing.Endpoints;

[Route("Services/Costing/CostingPartBalloonAreas/[action]")]
[ConnectionKey(typeof(MyRow)), ServiceAuthorize(typeof(MyRow))]
public class CostingPartBalloonAreasEndpoint : ServiceEndpoint
{
    [HttpPost, AuthorizeCreate(typeof(MyRow))]
    public SaveResponse Create(IUnitOfWork uow, SaveRequest<MyRow> request,
        [FromServices] ICostingPartBalloonAreasSaveHandler handler) => handler.Create(uow, request);

    [HttpPost, AuthorizeUpdate(typeof(MyRow))]
    public SaveResponse Update(IUnitOfWork uow, SaveRequest<MyRow> request,
        [FromServices] ICostingPartBalloonAreasSaveHandler handler) => handler.Update(uow, request);

    [HttpPost, AuthorizeDelete(typeof(MyRow))]
    public DeleteResponse Delete(IUnitOfWork uow, DeleteRequest request,
        [FromServices] ICostingPartBalloonAreasDeleteHandler handler) => handler.Delete(uow, request);

    [HttpPost]
    public RetrieveResponse<MyRow> Retrieve(IDbConnection connection, RetrieveRequest request,
        [FromServices] ICostingPartBalloonAreasRetrieveHandler handler) => handler.Retrieve(connection, request);

    [HttpPost, AuthorizeList(typeof(MyRow))]
    public ListResponse<MyRow> List(IDbConnection connection, ListRequest request,
        [FromServices] ICostingPartBalloonAreasListHandler handler) => handler.List(connection, request);
}
