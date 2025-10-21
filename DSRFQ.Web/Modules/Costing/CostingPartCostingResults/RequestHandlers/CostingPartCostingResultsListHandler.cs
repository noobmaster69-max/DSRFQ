using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Costing.CostingPartCostingResultsRow>;
using MyRow = DSRFQ.Costing.CostingPartCostingResultsRow;

namespace DSRFQ.Costing;

public interface ICostingPartCostingResultsListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartCostingResultsListHandler : ListRequestHandler<MyRow, MyRequest, MyResponse>, ICostingPartCostingResultsListHandler
{
    public CostingPartCostingResultsListHandler(IRequestContext context)
            : base(context)
    {
    }
}