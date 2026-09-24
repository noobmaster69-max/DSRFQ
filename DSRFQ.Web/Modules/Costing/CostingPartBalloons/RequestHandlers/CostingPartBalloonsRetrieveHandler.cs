using Serenity.Services;
using MyRequest = Serenity.Services.RetrieveRequest;
using MyResponse = Serenity.Services.RetrieveResponse<DSRFQ.Costing.CostingPartBalloonsRow>;
using MyRow = DSRFQ.Costing.CostingPartBalloonsRow;

namespace DSRFQ.Costing;

public interface ICostingPartBalloonsRetrieveHandler : IRetrieveHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartBalloonsRetrieveHandler(IRequestContext context)
    : RetrieveRequestHandler<MyRow, MyRequest, MyResponse>(context), ICostingPartBalloonsRetrieveHandler
{
}
