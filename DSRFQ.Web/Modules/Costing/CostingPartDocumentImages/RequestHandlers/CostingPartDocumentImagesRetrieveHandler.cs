using Serenity.Services;
using MyRequest = Serenity.Services.RetrieveRequest;
using MyResponse = Serenity.Services.RetrieveResponse<DSRFQ.Costing.CostingPartDocumentImagesRow>;
using MyRow = DSRFQ.Costing.CostingPartDocumentImagesRow;

namespace DSRFQ.Costing;

public interface ICostingPartDocumentImagesRetrieveHandler : IRetrieveHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartDocumentImagesRetrieveHandler : RetrieveRequestHandler<MyRow, MyRequest, MyResponse>, ICostingPartDocumentImagesRetrieveHandler
{
    public CostingPartDocumentImagesRetrieveHandler(IRequestContext context)
            : base(context)
    {
    }
}