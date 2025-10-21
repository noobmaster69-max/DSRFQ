using Serenity.Services;
using MyRequest = Serenity.Services.DeleteRequest;
using MyResponse = Serenity.Services.DeleteResponse;
using MyRow = DSRFQ.Costing.CostingPartDocumentImagesRow;

namespace DSRFQ.Costing;

public interface ICostingPartDocumentImagesDeleteHandler : IDeleteHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartDocumentImagesDeleteHandler : DeleteRequestHandler<MyRow, MyRequest, MyResponse>, ICostingPartDocumentImagesDeleteHandler
{
    public CostingPartDocumentImagesDeleteHandler(IRequestContext context)
            : base(context)
    {
    }
}