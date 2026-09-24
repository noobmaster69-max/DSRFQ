using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Costing.CostingPartMachineOptionsRow>;
using MyRow = DSRFQ.Costing.CostingPartMachineOptionsRow;

namespace DSRFQ.Costing;

public interface ICostingPartMachineOptionsListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartMachineOptionsListHandler : ListRequestHandler<MyRow, MyRequest, MyResponse>,
    ICostingPartMachineOptionsListHandler
{
    public CostingPartMachineOptionsListHandler(IRequestContext context)
        : base(context)
    {
    }
}
