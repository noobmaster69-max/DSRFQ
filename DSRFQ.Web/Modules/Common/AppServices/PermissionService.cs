using DSRFQ.Administration;
using System.Security.Claims;

namespace DSRFQ.AppServices;
public class PermissionService(ITwoLevelCache cache,
    ISqlConnections sqlConnections,
    ITypeSource typeSource,
    IUserAccessor userAccessor,
    IRolePermissionService rolePermissions,
    IHttpContextItemsAccessor httpContextItemsAccessor = null) :
    BasePermissionService<UserPermissionRow, UserRoleRow>(cache, sqlConnections, typeSource,
        userAccessor, rolePermissions, httpContextItemsAccessor)
{
    protected override bool HasImpersonationPermission(ClaimsPrincipal user, string permission)
    {
        // only super admin has impersonation permission
        return IsSuperAdmin(user);
    }

    /// <inheritdoc/>
    protected override bool IsSuperAdmin(ClaimsPrincipal user)
    {
        return user.Identity?.Name == "admin";
    }
}