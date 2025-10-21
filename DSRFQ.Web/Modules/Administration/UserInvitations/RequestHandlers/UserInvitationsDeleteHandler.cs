using Serenity.Services;
using MyRequest = Serenity.Services.DeleteRequest;
using MyResponse = Serenity.Services.DeleteResponse;
using MyRow = DSRFQ.Administration.UserInvitationsRow;

namespace DSRFQ.Administration;

public interface IUserInvitationsDeleteHandler : IDeleteHandler<MyRow, MyRequest, MyResponse> { }

public class UserInvitationsDeleteHandler : DeleteRequestHandler<MyRow, MyRequest, MyResponse>, IUserInvitationsDeleteHandler
{
    public UserInvitationsDeleteHandler(IRequestContext context)
            : base(context)
    {
    }
}