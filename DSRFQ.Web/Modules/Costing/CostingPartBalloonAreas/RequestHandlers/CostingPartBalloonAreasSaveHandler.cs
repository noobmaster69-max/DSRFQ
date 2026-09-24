using Serenity.Services;
using MyRequest = Serenity.Services.SaveRequest<DSRFQ.Costing.CostingPartBalloonAreasRow>;
using MyResponse = Serenity.Services.SaveResponse;
using MyRow = DSRFQ.Costing.CostingPartBalloonAreasRow;

namespace DSRFQ.Costing;

public interface ICostingPartBalloonAreasSaveHandler : ISaveHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartBalloonAreasSaveHandler(IRequestContext context)
    : SaveRequestHandler<MyRow, MyRequest, MyResponse>(context), ICostingPartBalloonAreasSaveHandler
{
}
