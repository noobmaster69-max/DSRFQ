using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Company.GroupsRow>;
using MyRow = DSRFQ.Company.GroupsRow;

namespace DSRFQ.Company;

public interface IGroupsListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class GroupsListHandler : ListRequestHandler<MyRow, MyRequest, MyResponse>, IGroupsListHandler
{
    public GroupsListHandler(IRequestContext context)
            : base(context)
    {
    }
}