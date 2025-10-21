using Serenity.Services;
using MyRequest = Serenity.Services.RetrieveRequest;
using MyResponse = Serenity.Services.RetrieveResponse<DSRFQ.Master.CostingStatusRow>;
using MyRow = DSRFQ.Master.CostingStatusRow;

namespace DSRFQ.Master;

public interface ICostingStatusRetrieveHandler : IRetrieveHandler<MyRow, MyRequest, MyResponse> { }

public class CostingStatusRetrieveHandler : RetrieveRequestHandler<MyRow, MyRequest, MyResponse>, ICostingStatusRetrieveHandler
{
    public CostingStatusRetrieveHandler(IRequestContext context)
            : base(context)
    {
    }
}