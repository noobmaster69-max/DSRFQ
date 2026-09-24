using Serenity.Services;
using MyRequest = Serenity.Services.RetrieveRequest;
using MyResponse = Serenity.Services.RetrieveResponse<DSRFQ.Costing.CostingPartStageTimingsRow>;
using MyRow = DSRFQ.Costing.CostingPartStageTimingsRow;

namespace DSRFQ.Costing;

public interface ICostingPartStageTimingsRetrieveHandler : IRetrieveHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartStageTimingsRetrieveHandler : RetrieveRequestHandler<MyRow, MyRequest, MyResponse>,
    ICostingPartStageTimingsRetrieveHandler
{
    public CostingPartStageTimingsRetrieveHandler(IRequestContext context)
        : base(context)
    {
    }
}
