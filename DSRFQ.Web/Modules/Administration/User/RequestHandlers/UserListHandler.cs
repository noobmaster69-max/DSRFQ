using MyRequest = DSRFQ.Administration.UserListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Administration.UserRow>;
using MyRow = DSRFQ.Administration.UserRow;

namespace DSRFQ.Administration;
public interface IUserListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class UserListHandler(IRequestContext context) :
    ListRequestHandler<MyRow, MyRequest, MyResponse>(context), IUserListHandler
{
    protected override void OnReturn()
    {
        base.OnReturn();

        if (Request.DataProtector != null &&
            Request.ClientHash != null &&
            Request.IncludeColumns != null &&
            Request.IncludeColumns.Contains("ImpersonationToken") &&
            Permissions.HasPermission("ImpersonateAs") &&
            !Response.Entities.IsEmptyOrNull())
        {
            foreach (var entity in Response.Entities)
                if (string.Compare(entity.Username, "admin", StringComparison.OrdinalIgnoreCase) != 0)
                    entity.ImpersonationToken = UserHelper.GetImpersonationToken(Request.DataProtector,
                        Request.ClientHash, Context.User.Identity.Name, entity.Username);
        }
    }
}