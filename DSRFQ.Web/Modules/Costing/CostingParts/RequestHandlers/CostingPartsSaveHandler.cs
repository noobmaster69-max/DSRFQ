using Serenity.Services;
using MyRequest = Serenity.Services.SaveRequest<DSRFQ.Costing.CostingPartsRow>;
using MyResponse = Serenity.Services.SaveResponse;
using MyRow = DSRFQ.Costing.CostingPartsRow;

namespace DSRFQ.Costing;

public interface ICostingPartsSaveHandler : ISaveHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartsSaveHandler : SaveRequestHandler<MyRow, MyRequest, MyResponse>, ICostingPartsSaveHandler
{
    public CostingPartsSaveHandler(IRequestContext context)
            : base(context)
    {
    }
}