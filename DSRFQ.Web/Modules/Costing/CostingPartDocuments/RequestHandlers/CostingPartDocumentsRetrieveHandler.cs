using Serenity.Services;
using MyRequest = Serenity.Services.RetrieveRequest;
using MyResponse = Serenity.Services.RetrieveResponse<DSRFQ.Costing.CostingPartDocumentsRow>;
using MyRow = DSRFQ.Costing.CostingPartDocumentsRow;

namespace DSRFQ.Costing;

public interface ICostingPartDocumentsRetrieveHandler : IRetrieveHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartDocumentsRetrieveHandler : RetrieveRequestHandler<MyRow, MyRequest, MyResponse>, ICostingPartDocumentsRetrieveHandler
{
    public CostingPartDocumentsRetrieveHandler(IRequestContext context)
            : base(context)
    {
    }
}