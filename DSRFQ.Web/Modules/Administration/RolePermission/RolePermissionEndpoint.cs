using MyRow = DSRFQ.Administration.RolePermissionRow;

namespace DSRFQ.Administration.Endpoints;
[Route("Services/Administration/RolePermission/[action]")]
[ConnectionKey(typeof(MyRow)), ServiceAuthorize(typeof(MyRow))]
public class RolePermissionEndpoint : ServiceEndpoint
{
    [HttpPost, AuthorizeUpdate(typeof(MyRow))]
    public RolePermissionUpdateResponse Update(IUnitOfWork uow, RolePermissionUpdateRequest request,
        [FromServices] IRolePermissionUpdateHandler handler)
    {
        return handler.Update(uow, request);
    }

    public RolePermissionListResponse List(IDbConnection connection, RolePermissionListRequest request,
        [FromServices] IRolePermissionListHandler handler)
    {
        return handler.List(connection, request);
    }
}
