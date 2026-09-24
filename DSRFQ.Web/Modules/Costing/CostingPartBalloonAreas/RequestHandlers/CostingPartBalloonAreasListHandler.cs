using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Costing.CostingPartBalloonAreasRow>;
using MyRow = DSRFQ.Costing.CostingPartBalloonAreasRow;

namespace DSRFQ.Costing;

public interface ICostingPartBalloonAreasListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartBalloonAreasListHandler(IRequestContext context)
    : ListRequestHandler<MyRow, MyRequest, MyResponse>(context), ICostingPartBalloonAreasListHandler
{
}
