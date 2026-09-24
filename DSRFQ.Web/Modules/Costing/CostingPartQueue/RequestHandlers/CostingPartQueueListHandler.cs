using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Costing.CostingPartQueueRow>;
using MyRow = DSRFQ.Costing.CostingPartQueueRow;

namespace DSRFQ.Costing;

public interface ICostingPartQueueListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartQueueListHandler : ListRequestHandler<MyRow, MyRequest, MyResponse>,
    ICostingPartQueueListHandler
{
    public CostingPartQueueListHandler(IRequestContext context)
        : base(context)
    {
    }
}
