using Serenity.Services;
using MyRequest = Serenity.Services.RetrieveRequest;
using MyResponse = Serenity.Services.RetrieveResponse<DSRFQ.Costing.CostingPartBalloonMaskZonesRow>;
using MyRow = DSRFQ.Costing.CostingPartBalloonMaskZonesRow;

namespace DSRFQ.Costing;

public interface ICostingPartBalloonMaskZonesRetrieveHandler : IRetrieveHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartBalloonMaskZonesRetrieveHandler(IRequestContext context)
    : RetrieveRequestHandler<MyRow, MyRequest, MyResponse>(context), ICostingPartBalloonMaskZonesRetrieveHandler
{
}
