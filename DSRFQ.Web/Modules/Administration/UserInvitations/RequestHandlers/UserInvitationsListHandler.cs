using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Administration.UserInvitationsRow>;
using MyRow = DSRFQ.Administration.UserInvitationsRow;

namespace DSRFQ.Administration;

public interface IUserInvitationsListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class UserInvitationsListHandler : ListRequestHandler<MyRow, MyRequest, MyResponse>, IUserInvitationsListHandler
{
    public UserInvitationsListHandler(IRequestContext context)
            : base(context)
    {
    }
}