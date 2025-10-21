using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Costing.CostingPartDocumentImagesRow>;
using MyRow = DSRFQ.Costing.CostingPartDocumentImagesRow;

namespace DSRFQ.Costing;

public interface ICostingPartDocumentImagesListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartDocumentImagesListHandler : ListRequestHandler<MyRow, MyRequest, MyResponse>, ICostingPartDocumentImagesListHandler
{
    public CostingPartDocumentImagesListHandler(IRequestContext context)
            : base(context)
    {
    }
}