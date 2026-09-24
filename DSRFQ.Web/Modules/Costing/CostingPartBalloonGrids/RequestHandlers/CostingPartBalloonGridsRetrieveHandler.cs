using Serenity.Services;
using MyRequest = Serenity.Services.RetrieveRequest;
using MyResponse = Serenity.Services.RetrieveResponse<DSRFQ.Costing.CostingPartBalloonGridsRow>;
using MyRow = DSRFQ.Costing.CostingPartBalloonGridsRow;

namespace DSRFQ.Costing;

public interface ICostingPartBalloonGridsRetrieveHandler : IRetrieveHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartBalloonGridsRetrieveHandler(IRequestContext context)
    : RetrieveRequestHandler<MyRow, MyRequest, MyResponse>(context), ICostingPartBalloonGridsRetrieveHandler
{
}
