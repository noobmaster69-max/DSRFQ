using Serenity.Services;
using MyRequest = Serenity.Services.RetrieveRequest;
using MyResponse = Serenity.Services.RetrieveResponse<DSRFQ.Costing.CostingPartCostingResultsRow>;
using MyRow = DSRFQ.Costing.CostingPartCostingResultsRow;

namespace DSRFQ.Costing;

public interface ICostingPartCostingResultsRetrieveHandler : IRetrieveHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartCostingResultsRetrieveHandler : RetrieveRequestHandler<MyRow, MyRequest, MyResponse>, ICostingPartCostingResultsRetrieveHandler
{
    public CostingPartCostingResultsRetrieveHandler(IRequestContext context)
            : base(context)
    {
    }
}