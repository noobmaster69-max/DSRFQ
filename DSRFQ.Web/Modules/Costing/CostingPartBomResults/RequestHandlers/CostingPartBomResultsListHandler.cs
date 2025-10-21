using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Costing.CostingPartBomResultsRow>;
using MyRow = DSRFQ.Costing.CostingPartBomResultsRow;

namespace DSRFQ.Costing;

public interface ICostingPartBomResultsListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartBomResultsListHandler : ListRequestHandler<MyRow, MyRequest, MyResponse>, ICostingPartBomResultsListHandler
{
    public CostingPartBomResultsListHandler(IRequestContext context)
            : base(context)
    {
    }
}