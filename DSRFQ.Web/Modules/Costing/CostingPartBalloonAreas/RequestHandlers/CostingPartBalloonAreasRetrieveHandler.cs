using Serenity.Services;
using MyRequest = Serenity.Services.RetrieveRequest;
using MyResponse = Serenity.Services.RetrieveResponse<DSRFQ.Costing.CostingPartBalloonAreasRow>;
using MyRow = DSRFQ.Costing.CostingPartBalloonAreasRow;

namespace DSRFQ.Costing;

public interface ICostingPartBalloonAreasRetrieveHandler : IRetrieveHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartBalloonAreasRetrieveHandler(IRequestContext context)
    : RetrieveRequestHandler<MyRow, MyRequest, MyResponse>(context), ICostingPartBalloonAreasRetrieveHandler
{
}
