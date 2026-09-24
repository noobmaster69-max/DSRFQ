using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Costing.CostingPartBalloonsRow>;
using MyRow = DSRFQ.Costing.CostingPartBalloonsRow;

namespace DSRFQ.Costing;

public interface ICostingPartBalloonsListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartBalloonsListHandler(IRequestContext context)
    : ListRequestHandler<MyRow, MyRequest, MyResponse>(context), ICostingPartBalloonsListHandler
{
}
