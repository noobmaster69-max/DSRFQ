using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Costing.CostingPartDocumentsRow>;
using MyRow = DSRFQ.Costing.CostingPartDocumentsRow;

namespace DSRFQ.Costing;

public interface ICostingPartDocumentsListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartDocumentsListHandler : ListRequestHandler<MyRow, MyRequest, MyResponse>, ICostingPartDocumentsListHandler
{
    public CostingPartDocumentsListHandler(IRequestContext context)
            : base(context)
    {
    }
}