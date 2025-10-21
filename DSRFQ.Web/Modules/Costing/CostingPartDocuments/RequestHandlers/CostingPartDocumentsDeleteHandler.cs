using Serenity.Services;
using MyRequest = Serenity.Services.DeleteRequest;
using MyResponse = Serenity.Services.DeleteResponse;
using MyRow = DSRFQ.Costing.CostingPartDocumentsRow;

namespace DSRFQ.Costing;

public interface ICostingPartDocumentsDeleteHandler : IDeleteHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartDocumentsDeleteHandler : DeleteRequestHandler<MyRow, MyRequest, MyResponse>, ICostingPartDocumentsDeleteHandler
{
    public CostingPartDocumentsDeleteHandler(IRequestContext context)
            : base(context)
    {
    }
}