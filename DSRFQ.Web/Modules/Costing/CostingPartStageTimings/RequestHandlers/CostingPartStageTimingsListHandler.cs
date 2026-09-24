using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Costing.CostingPartStageTimingsRow>;
using MyRow = DSRFQ.Costing.CostingPartStageTimingsRow;

namespace DSRFQ.Costing;

public interface ICostingPartStageTimingsListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartStageTimingsListHandler : ListRequestHandler<MyRow, MyRequest, MyResponse>,
    ICostingPartStageTimingsListHandler
{
    public CostingPartStageTimingsListHandler(IRequestContext context)
        : base(context)
    {
    }
}
