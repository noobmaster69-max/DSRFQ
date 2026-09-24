using Serenity.Services;
using MyRequest = Serenity.Services.SaveRequest<DSRFQ.Costing.CostingPartBalloonsRow>;
using MyResponse = Serenity.Services.SaveResponse;
using MyRow = DSRFQ.Costing.CostingPartBalloonsRow;

namespace DSRFQ.Costing;

public interface ICostingPartBalloonsSaveHandler : ISaveHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartBalloonsSaveHandler(IRequestContext context)
    : SaveRequestHandler<MyRow, MyRequest, MyResponse>(context), ICostingPartBalloonsSaveHandler
{
}
