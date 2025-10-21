using Serenity.Services;
using MyRequest = Serenity.Services.RetrieveRequest;
using MyResponse = Serenity.Services.RetrieveResponse<DSRFQ.Costing.CostingPartSpecialProcessResultsRow>;
using MyRow = DSRFQ.Costing.CostingPartSpecialProcessResultsRow;

namespace DSRFQ.Costing;

public interface ICostingPartSpecialProcessResultsRetrieveHandler : IRetrieveHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartSpecialProcessResultsRetrieveHandler : RetrieveRequestHandler<MyRow, MyRequest, MyResponse>, ICostingPartSpecialProcessResultsRetrieveHandler
{
    public CostingPartSpecialProcessResultsRetrieveHandler(IRequestContext context)
            : base(context)
    {
    }
}