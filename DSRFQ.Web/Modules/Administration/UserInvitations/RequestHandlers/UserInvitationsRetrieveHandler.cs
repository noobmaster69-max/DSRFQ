using Serenity.Services;
using MyRequest = Serenity.Services.RetrieveRequest;
using MyResponse = Serenity.Services.RetrieveResponse<DSRFQ.Administration.UserInvitationsRow>;
using MyRow = DSRFQ.Administration.UserInvitationsRow;

namespace DSRFQ.Administration;

public interface IUserInvitationsRetrieveHandler : IRetrieveHandler<MyRow, MyRequest, MyResponse> { }

public class UserInvitationsRetrieveHandler : RetrieveRequestHandler<MyRow, MyRequest, MyResponse>, IUserInvitationsRetrieveHandler
{
    public UserInvitationsRetrieveHandler(IRequestContext context)
            : base(context)
    {
    }
}