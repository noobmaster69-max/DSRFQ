using Serenity.Services;
using MyRequest = Serenity.Services.SaveRequest<DSRFQ.Costing.CostingPartBalloonMaskZonesRow>;
using MyResponse = Serenity.Services.SaveResponse;
using MyRow = DSRFQ.Costing.CostingPartBalloonMaskZonesRow;

namespace DSRFQ.Costing;

public interface ICostingPartBalloonMaskZonesSaveHandler : ISaveHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartBalloonMaskZonesSaveHandler(IRequestContext context)
    : SaveRequestHandler<MyRow, MyRequest, MyResponse>(context), ICostingPartBalloonMaskZonesSaveHandler
{
}
