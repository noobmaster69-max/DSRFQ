using Serenity.Services;
using MyRequest = Serenity.Services.DeleteRequest;
using MyResponse = Serenity.Services.DeleteResponse;
using MyRow = DSRFQ.Costing.CostingPartSpecialProcessResultsRow;

namespace DSRFQ.Costing;

public interface ICostingPartSpecialProcessResultsDeleteHandler : IDeleteHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartSpecialProcessResultsDeleteHandler : DeleteRequestHandler<MyRow, MyRequest, MyResponse>, ICostingPartSpecialProcessResultsDeleteHandler
{
    public CostingPartSpecialProcessResultsDeleteHandler(IRequestContext context)
            : base(context)
    {
    }
}