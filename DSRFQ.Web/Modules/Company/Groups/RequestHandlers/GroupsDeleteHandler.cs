using Serenity.Services;
using MyRequest = Serenity.Services.DeleteRequest;
using MyResponse = Serenity.Services.DeleteResponse;
using MyRow = DSRFQ.Company.GroupsRow;

namespace DSRFQ.Company;

public interface IGroupsDeleteHandler : IDeleteHandler<MyRow, MyRequest, MyResponse> { }

public class GroupsDeleteHandler : DeleteRequestHandler<MyRow, MyRequest, MyResponse>, IGroupsDeleteHandler
{
    public GroupsDeleteHandler(IRequestContext context)
            : base(context)
    {
    }
}