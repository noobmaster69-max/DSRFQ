using Serenity.Services;
using MyRequest = Serenity.Services.SaveRequest<DSRFQ.Costing.CostingPartSpecialProcessResultsRow>;
using MyResponse = Serenity.Services.SaveResponse;
using MyRow = DSRFQ.Costing.CostingPartSpecialProcessResultsRow;

namespace DSRFQ.Costing;

public interface ICostingPartSpecialProcessResultsSaveHandler : ISaveHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartSpecialProcessResultsSaveHandler : SaveRequestHandler<MyRow, MyRequest, MyResponse>, ICostingPartSpecialProcessResultsSaveHandler
{
    public CostingPartSpecialProcessResultsSaveHandler(IRequestContext context)
            : base(context)
    {
    }
}