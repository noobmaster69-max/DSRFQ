using Serenity.Services;
using MyRequest = Serenity.Services.RetrieveRequest;
using MyResponse = Serenity.Services.RetrieveResponse<DSRFQ.Costing.CostingPartsRow>;
using MyRow = DSRFQ.Costing.CostingPartsRow;

namespace DSRFQ.Costing;

public interface ICostingPartsRetrieveHandler : IRetrieveHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartsRetrieveHandler : RetrieveRequestHandler<MyRow, MyRequest, MyResponse>, ICostingPartsRetrieveHandler
{
    public CostingPartsRetrieveHandler(IRequestContext context)
            : base(context)
    {
    }
}