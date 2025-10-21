using Serenity.Services;
using MyRequest = Serenity.Services.SaveRequest<DSRFQ.Master.CostingStatusRow>;
using MyResponse = Serenity.Services.SaveResponse;
using MyRow = DSRFQ.Master.CostingStatusRow;

namespace DSRFQ.Master;

public interface ICostingStatusSaveHandler : ISaveHandler<MyRow, MyRequest, MyResponse> { }

public class CostingStatusSaveHandler : SaveRequestHandler<MyRow, MyRequest, MyResponse>, ICostingStatusSaveHandler
{
    public CostingStatusSaveHandler(IRequestContext context)
            : base(context)
    {
    }
}