using Serenity.Services;
using MyRequest = Serenity.Services.SaveRequest<DSRFQ.Company.GroupsRow>;
using MyResponse = Serenity.Services.SaveResponse;
using MyRow = DSRFQ.Company.GroupsRow;

namespace DSRFQ.Company;

public interface IGroupsSaveHandler : ISaveHandler<MyRow, MyRequest, MyResponse> { }

public class GroupsSaveHandler : SaveRequestHandler<MyRow, MyRequest, MyResponse>, IGroupsSaveHandler
{
    public GroupsSaveHandler(IRequestContext context)
            : base(context)
    {
    }
}