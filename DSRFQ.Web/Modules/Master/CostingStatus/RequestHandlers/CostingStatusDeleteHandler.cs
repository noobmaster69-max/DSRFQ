using Serenity.Services;
using MyRequest = Serenity.Services.DeleteRequest;
using MyResponse = Serenity.Services.DeleteResponse;
using MyRow = DSRFQ.Master.CostingStatusRow;

namespace DSRFQ.Master;

public interface ICostingStatusDeleteHandler : IDeleteHandler<MyRow, MyRequest, MyResponse> { }

public class CostingStatusDeleteHandler : DeleteRequestHandler<MyRow, MyRequest, MyResponse>, ICostingStatusDeleteHandler
{
    public CostingStatusDeleteHandler(IRequestContext context)
            : base(context)
    {
    }
}