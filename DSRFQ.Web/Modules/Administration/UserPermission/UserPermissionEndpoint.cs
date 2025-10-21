using MyRow = DSRFQ.Administration.UserPermissionRow;

namespace DSRFQ.Administration.Endpoints;
[Route("Services/Administration/UserPermission/[action]")]
[ConnectionKey(typeof(MyRow)), ServiceAuthorize(typeof(MyRow))]
public class UserPermissionEndpoint : ServiceEndpoint
{
    [HttpPost, AuthorizeUpdate(typeof(MyRow))]
    public UserPermissionUpdateResponse Update(IUnitOfWork uow, UserPermissionUpdateRequest request,
        [FromServices] IUserPermissionUpdateHandler handler)
    {
        return handler.Update(uow, request);
    }

    public UserPermissionListResponse List(IDbConnection connection, UserPermissionListRequest request,
        [FromServices] IUserPermissionListHandler handler)
    {
        return handler.List(connection, request);
    }
}