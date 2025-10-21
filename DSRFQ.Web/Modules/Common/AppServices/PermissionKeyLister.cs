using DSRFQ.Administration;

namespace DSRFQ.AppServices;
public class PermissionKeyLister(ISqlConnections sqlConnections, ITwoLevelCache cache, ITypeSource typeSource)
    : BasePermissionKeyLister(cache, typeSource)
{
    protected override string GetCacheGroupKey()
    {
        return RoleRow.Fields.GenerationKey;
    }

    protected override IEnumerable<string> GetRoleKeys()
    {
        return RoleHelper.GetRoleById(cache, sqlConnections).Values
            .Select(x => x.RoleKey)
            .Where(x => !string.IsNullOrEmpty(x));
    }
}