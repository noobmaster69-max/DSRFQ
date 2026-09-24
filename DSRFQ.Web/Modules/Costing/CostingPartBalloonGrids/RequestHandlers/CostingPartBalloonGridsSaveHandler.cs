using Serenity.Services;
using MyRequest = Serenity.Services.SaveRequest<DSRFQ.Costing.CostingPartBalloonGridsRow>;
using MyResponse = Serenity.Services.SaveResponse;
using MyRow = DSRFQ.Costing.CostingPartBalloonGridsRow;

namespace DSRFQ.Costing;

public interface ICostingPartBalloonGridsSaveHandler : ISaveHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartBalloonGridsSaveHandler(IRequestContext context)
    : SaveRequestHandler<MyRow, MyRequest, MyResponse>(context), ICostingPartBalloonGridsSaveHandler
{
}
