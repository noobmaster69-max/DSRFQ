using MyRow = DSRFQ.Administration.UserPermissionRow;

namespace DSRFQ.Administration;
public interface IUserPermissionListHandler : IRequestHandler
{
    public UserPermissionListResponse List(IDbConnection connection, UserPermissionListRequest request);
}

public class UserPermissionListHandler(IRequestContext context) : BaseRequestHandler(context), IUserPermissionListHandler
{
    public UserPermissionListResponse List(IDbConnection connection, UserPermissionListRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(request.UserID);

        Context.AuthorizeList<MyRow>();

        var fld = MyRow.Fields;
        var response = new UserPermissionListResponse
        {
            Entities =
            [
                .. connection.List<MyRow>(query => query
                    .Select(fld.PermissionKey)
                    .Select(fld.Granted)
                    .Where(fld.UserId == request.UserID.Value)),
            ],
            RolePermissions = request.RolePermissions ? GetRolePermissions(connection, request) : null
        };

        return response;
    }

    private List<string> GetRolePermissions(IDbConnection connection, UserPermissionListRequest request)
    {
        var rp = RolePermissionRow.Fields.As("rp");
        var ur = UserRoleRow.Fields.As("ur");

        var query = new SqlQuery()
            .From(rp)
            .Select(rp.PermissionKey)
            .Distinct(true)
            .OrderBy(rp.PermissionKey);

        query.Where(rp.RoleId.In(
            query.SubQuery()
                .From(ur)
                .Select(ur.RoleId)
                .Where(ur.UserId == request.UserID.Value)
        ));

        return connection.Query<string>(query).ToList();
    }
}