using Serenity.Services;
using MyRequest = Serenity.Services.DeleteRequest;
using MyResponse = Serenity.Services.DeleteResponse;
using MyRow = DSRFQ.Costing.CostingPartBomResultsRow;

namespace DSRFQ.Costing;

public interface ICostingPartBomResultsDeleteHandler : IDeleteHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartBomResultsDeleteHandler : DeleteRequestHandler<MyRow, MyRequest, MyResponse>, ICostingPartBomResultsDeleteHandler
{
    public CostingPartBomResultsDeleteHandler(IRequestContext context)
            : base(context)
    {
    }
}