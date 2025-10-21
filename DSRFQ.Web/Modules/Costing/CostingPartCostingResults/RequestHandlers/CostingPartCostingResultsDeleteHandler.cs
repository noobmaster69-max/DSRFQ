using Serenity.Services;
using MyRequest = Serenity.Services.DeleteRequest;
using MyResponse = Serenity.Services.DeleteResponse;
using MyRow = DSRFQ.Costing.CostingPartCostingResultsRow;

namespace DSRFQ.Costing;

public interface ICostingPartCostingResultsDeleteHandler : IDeleteHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartCostingResultsDeleteHandler : DeleteRequestHandler<MyRow, MyRequest, MyResponse>, ICostingPartCostingResultsDeleteHandler
{
    public CostingPartCostingResultsDeleteHandler(IRequestContext context)
            : base(context)
    {
    }
}