using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Costing.CostingPartBalloonGridsRow>;
using MyRow = DSRFQ.Costing.CostingPartBalloonGridsRow;

namespace DSRFQ.Costing;

public interface ICostingPartBalloonGridsListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartBalloonGridsListHandler(IRequestContext context)
    : ListRequestHandler<MyRow, MyRequest, MyResponse>(context), ICostingPartBalloonGridsListHandler
{
}
