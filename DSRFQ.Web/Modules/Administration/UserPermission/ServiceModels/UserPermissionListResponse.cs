namespace DSRFQ.Administration;

public class UserPermissionListResponse : ListResponse<UserPermissionRow>
{
    public List<string> RolePermissions { get; set; }
}