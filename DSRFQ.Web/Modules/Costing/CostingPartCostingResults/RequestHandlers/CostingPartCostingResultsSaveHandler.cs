using Serenity.Services;
using MyRequest = Serenity.Services.SaveRequest<DSRFQ.Costing.CostingPartCostingResultsRow>;
using MyResponse = Serenity.Services.SaveResponse;
using MyRow = DSRFQ.Costing.CostingPartCostingResultsRow;

namespace DSRFQ.Costing;

public interface ICostingPartCostingResultsSaveHandler : ISaveHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartCostingResultsSaveHandler : SaveRequestHandler<MyRow, MyRequest, MyResponse>, ICostingPartCostingResultsSaveHandler
{
    public CostingPartCostingResultsSaveHandler(IRequestContext context)
            : base(context)
    {
    }
}