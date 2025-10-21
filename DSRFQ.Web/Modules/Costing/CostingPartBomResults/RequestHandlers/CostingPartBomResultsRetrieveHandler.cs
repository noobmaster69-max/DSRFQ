using Serenity.Services;
using MyRequest = Serenity.Services.RetrieveRequest;
using MyResponse = Serenity.Services.RetrieveResponse<DSRFQ.Costing.CostingPartBomResultsRow>;
using MyRow = DSRFQ.Costing.CostingPartBomResultsRow;

namespace DSRFQ.Costing;

public interface ICostingPartBomResultsRetrieveHandler : IRetrieveHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartBomResultsRetrieveHandler : RetrieveRequestHandler<MyRow, MyRequest, MyResponse>, ICostingPartBomResultsRetrieveHandler
{
    public CostingPartBomResultsRetrieveHandler(IRequestContext context)
            : base(context)
    {
    }
}