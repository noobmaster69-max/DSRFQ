using Serenity.Services;
using MyRequest = Serenity.Services.DeleteRequest;
using MyResponse = Serenity.Services.DeleteResponse;
using MyRow = DSRFQ.Costing.CostingPartBalloonGridsRow;

namespace DSRFQ.Costing;

public interface ICostingPartBalloonGridsDeleteHandler : IDeleteHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartBalloonGridsDeleteHandler(IRequestContext context)
    : DeleteRequestHandler<MyRow, MyRequest, MyResponse>(context), ICostingPartBalloonGridsDeleteHandler
{
}
