using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Master.CostingStatusRow>;
using MyRow = DSRFQ.Master.CostingStatusRow;

namespace DSRFQ.Master;

public interface ICostingStatusListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class CostingStatusListHandler : ListRequestHandler<MyRow, MyRequest, MyResponse>, ICostingStatusListHandler
{
    public CostingStatusListHandler(IRequestContext context)
            : base(context)
    {
    }
}