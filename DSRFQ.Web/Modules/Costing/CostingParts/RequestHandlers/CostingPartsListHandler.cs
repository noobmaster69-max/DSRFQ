using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Costing.CostingPartsRow>;
using MyRow = DSRFQ.Costing.CostingPartsRow;

namespace DSRFQ.Costing;

public interface ICostingPartsListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartsListHandler : ListRequestHandler<MyRow, MyRequest, MyResponse>, ICostingPartsListHandler
{
    public CostingPartsListHandler(IRequestContext context)
            : base(context)
    {
    }
}