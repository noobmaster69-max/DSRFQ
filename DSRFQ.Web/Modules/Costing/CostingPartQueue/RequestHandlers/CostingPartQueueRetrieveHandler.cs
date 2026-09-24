using Serenity.Services;
using MyRequest = Serenity.Services.RetrieveRequest;
using MyResponse = Serenity.Services.RetrieveResponse<DSRFQ.Costing.CostingPartQueueRow>;
using MyRow = DSRFQ.Costing.CostingPartQueueRow;

namespace DSRFQ.Costing;

public interface ICostingPartQueueRetrieveHandler : IRetrieveHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartQueueRetrieveHandler : RetrieveRequestHandler<MyRow, MyRequest, MyResponse>,
    ICostingPartQueueRetrieveHandler
{
    public CostingPartQueueRetrieveHandler(IRequestContext context)
        : base(context)
    {
    }
}
