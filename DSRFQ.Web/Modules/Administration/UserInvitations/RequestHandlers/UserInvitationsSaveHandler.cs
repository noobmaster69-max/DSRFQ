using Serenity.Services;
using MyRequest = Serenity.Services.SaveRequest<DSRFQ.Administration.UserInvitationsRow>;
using MyResponse = Serenity.Services.SaveResponse;
using MyRow = DSRFQ.Administration.UserInvitationsRow;

namespace DSRFQ.Administration;

public interface IUserInvitationsSaveHandler : ISaveHandler<MyRow, MyRequest, MyResponse> { }

public class UserInvitationsSaveHandler : SaveRequestHandler<MyRow, MyRequest, MyResponse>, IUserInvitationsSaveHandler
{
    public UserInvitationsSaveHandler(IRequestContext context)
            : base(context)
    {
    }
}