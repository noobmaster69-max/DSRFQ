using Serenity.Services;
using MyRequest = Serenity.Services.RetrieveRequest;
using MyResponse = Serenity.Services.RetrieveResponse<DSRFQ.Company.GroupsRow>;
using MyRow = DSRFQ.Company.GroupsRow;

namespace DSRFQ.Company;

public interface IGroupsRetrieveHandler : IRetrieveHandler<MyRow, MyRequest, MyResponse> { }

public class GroupsRetrieveHandler : RetrieveRequestHandler<MyRow, MyRequest, MyResponse>, IGroupsRetrieveHandler
{
    public GroupsRetrieveHandler(IRequestContext context)
            : base(context)
    {
    }
}