using Serenity.Services;
using MyRequest = Serenity.Services.DeleteRequest;
using MyResponse = Serenity.Services.DeleteResponse;
using MyRow = DSRFQ.Costing.CostingPartBalloonsRow;

namespace DSRFQ.Costing;

public interface ICostingPartBalloonsDeleteHandler : IDeleteHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartBalloonsDeleteHandler(IRequestContext context)
    : DeleteRequestHandler<MyRow, MyRequest, MyResponse>(context), ICostingPartBalloonsDeleteHandler
{
}
