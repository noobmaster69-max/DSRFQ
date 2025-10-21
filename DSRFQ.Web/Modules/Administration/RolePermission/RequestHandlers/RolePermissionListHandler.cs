using MyRow = DSRFQ.Administration.RolePermissionRow;

namespace DSRFQ.Administration;
public interface IRolePermissionListHandler : IRequestHandler
{
    public RolePermissionListResponse List(IDbConnection connection, RolePermissionListRequest request);
}

public class RolePermissionListHandler(IRequestContext context) : BaseRequestHandler(context), IRolePermissionListHandler
{
    public RolePermissionListResponse List(IDbConnection connection, RolePermissionListRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(request.RoleID);

        Context.AuthorizeList<MyRow>();

        var fld = MyRow.Fields;
        var response = new RolePermissionListResponse
        {
            Entities = connection.Query<string>(
                new SqlQuery().From(fld)
                    .Select(fld.PermissionKey)
                    .Where(fld.RoleId == request.RoleID.Value))
                .ToList()
        };

        return response;
    }
}