using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Costing.CostingPartFilesRow>;
using MyRow = DSRFQ.Costing.CostingPartFilesRow;

namespace DSRFQ.Costing;

public interface ICostingPartFilesListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartFilesListHandler : ListRequestHandler<MyRow, MyRequest, MyResponse>,
    ICostingPartFilesListHandler
{
    public CostingPartFilesListHandler(IRequestContext context)
        : base(context)
    {
    }
}
