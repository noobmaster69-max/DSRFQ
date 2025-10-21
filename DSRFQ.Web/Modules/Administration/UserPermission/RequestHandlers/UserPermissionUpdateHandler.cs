using MyRow = DSRFQ.Administration.UserPermissionRow;

namespace DSRFQ.Administration;
public interface IUserPermissionUpdateHandler : IRequestHandler
{
    UserPermissionUpdateResponse Update(IUnitOfWork uow, UserPermissionUpdateRequest request);
}

public class UserPermissionUpdateHandler(IRequestContext context) : BaseRequestHandler(context), IUserPermissionUpdateHandler
{
    public UserPermissionUpdateResponse Update(IUnitOfWork uow, UserPermissionUpdateRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(request.UserID);
        ArgumentNullException.ThrowIfNull(request.Permissions);

        var userID = request.UserID.Value;
        var oldList = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase);
        foreach (var p in GetExisting(uow.Connection, userID))
            oldList[p.PermissionKey] = p.Granted.Value;

        var newList = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase);
        foreach (var p in request.Permissions)
            newList[p.PermissionKey] = p.Granted ?? false;

        if (oldList.Count == newList.Count &&
            oldList.All(x => newList.ContainsKey(x.Key) && newList[x.Key] == x.Value))
            return new();

        var fld = MyRow.Fields;

        foreach (var k in oldList.Keys)
        {
            if (newList.ContainsKey(k))
                continue;

            new SqlDelete(fld.TableName)
                .Where(
                    new Criteria(fld.UserId) == userID &
                    new Criteria(fld.PermissionKey) == k)
                .Execute(uow.Connection);
        }

        foreach (var k in newList.Keys)
        {
            if (!oldList.TryGetValue(k, out bool value))
            {
                uow.Connection.Insert(new MyRow
                {
                    UserId = userID,
                    PermissionKey = k,
                    Granted = newList[k]
                });
            }
            else if (value != newList[k])
            {
                new SqlUpdate(fld.TableName)
                    .Where(
                        fld.UserId == userID &
                        fld.PermissionKey == k)
                    .Set(fld.Granted, newList[k])
                    .Execute(uow.Connection);
            }
        }

        Cache.InvalidateOnCommit(uow, fld);

        return new();
    }

    private List<MyRow> GetExisting(IDbConnection connection, int userId)
    {
        var fld = MyRow.Fields;

        return connection.List<MyRow>(q =>
        {
            q.Select(fld.UserPermissionId, fld.PermissionKey, fld.Granted)
                .Where(new Criteria(fld.UserId) == userId);
        });
    }
}