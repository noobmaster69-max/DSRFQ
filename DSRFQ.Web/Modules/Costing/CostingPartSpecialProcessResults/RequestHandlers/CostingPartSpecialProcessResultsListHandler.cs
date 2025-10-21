using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Costing.CostingPartSpecialProcessResultsRow>;
using MyRow = DSRFQ.Costing.CostingPartSpecialProcessResultsRow;

namespace DSRFQ.Costing;

public interface ICostingPartSpecialProcessResultsListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartSpecialProcessResultsListHandler : ListRequestHandler<MyRow, MyRequest, MyResponse>, ICostingPartSpecialProcessResultsListHandler
{
    public CostingPartSpecialProcessResultsListHandler(IRequestContext context)
            : base(context)
    {
    }
}