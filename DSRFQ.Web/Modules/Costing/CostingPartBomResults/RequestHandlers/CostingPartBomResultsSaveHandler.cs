using Serenity.Services;
using MyRequest = Serenity.Services.SaveRequest<DSRFQ.Costing.CostingPartBomResultsRow>;
using MyResponse = Serenity.Services.SaveResponse;
using MyRow = DSRFQ.Costing.CostingPartBomResultsRow;

namespace DSRFQ.Costing;

public interface ICostingPartBomResultsSaveHandler : ISaveHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartBomResultsSaveHandler : SaveRequestHandler<MyRow, MyRequest, MyResponse>, ICostingPartBomResultsSaveHandler
{
    public CostingPartBomResultsSaveHandler(IRequestContext context)
            : base(context)
    {
    }
}