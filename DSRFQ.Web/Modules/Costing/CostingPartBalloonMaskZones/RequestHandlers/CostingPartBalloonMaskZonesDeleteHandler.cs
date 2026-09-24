using Serenity.Services;
using MyRequest = Serenity.Services.DeleteRequest;
using MyResponse = Serenity.Services.DeleteResponse;
using MyRow = DSRFQ.Costing.CostingPartBalloonMaskZonesRow;

namespace DSRFQ.Costing;

public interface ICostingPartBalloonMaskZonesDeleteHandler : IDeleteHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartBalloonMaskZonesDeleteHandler(IRequestContext context)
    : DeleteRequestHandler<MyRow, MyRequest, MyResponse>(context), ICostingPartBalloonMaskZonesDeleteHandler
{
}
