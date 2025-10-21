using MyRow = DSRFQ.Administration.RolePermissionRow;

namespace DSRFQ.Administration;
public interface IRolePermissionUpdateHandler : IRequestHandler
{
    RolePermissionUpdateResponse Update(IUnitOfWork uow, RolePermissionUpdateRequest request);
}

public class RolePermissionUpdateHandler(IRequestContext context) : BaseRequestHandler(context), IRolePermissionUpdateHandler
{
    public RolePermissionUpdateResponse Update(IUnitOfWork uow, RolePermissionUpdateRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(request.RoleID);
        ArgumentNullException.ThrowIfNull(request.Permissions);

        Context.AuthorizeUpdate<MyRow>();

        var roleID = request.RoleID.Value;
        var oldList = new HashSet<string>(new RolePermissionListHandler(Context).List(uow.Connection,
            new() { RoleID = request.RoleID }).Entities, StringComparer.OrdinalIgnoreCase);

        var newList = new HashSet<string>(request.Permissions.ToList(),
            StringComparer.OrdinalIgnoreCase);

        if (oldList.SetEquals(newList))
            return new();

        var fld = MyRow.Fields;
        foreach (var k in oldList)
        {
            if (newList.Contains(k))
                continue;

            new SqlDelete(fld.TableName)
                .Where(fld.RoleId == roleID && fld.PermissionKey == k)
                .Execute(uow.Connection);
        }

        foreach (var k in newList)
        {
            if (oldList.Contains(k))
                continue;

            uow.Connection.Insert(new MyRow
            {
                RoleId = roleID,
                PermissionKey = k
            });
        }

        Cache.InvalidateOnCommit(uow, fld);
        Cache.InvalidateOnCommit(uow, UserPermissionRow.Fields);

        return new();
    }
}