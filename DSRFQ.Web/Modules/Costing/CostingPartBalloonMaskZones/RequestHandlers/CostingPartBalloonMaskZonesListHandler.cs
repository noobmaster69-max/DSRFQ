using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Costing.CostingPartBalloonMaskZonesRow>;
using MyRow = DSRFQ.Costing.CostingPartBalloonMaskZonesRow;

namespace DSRFQ.Costing;

public interface ICostingPartBalloonMaskZonesListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartBalloonMaskZonesListHandler(IRequestContext context)
    : ListRequestHandler<MyRow, MyRequest, MyResponse>(context), ICostingPartBalloonMaskZonesListHandler
{
}
