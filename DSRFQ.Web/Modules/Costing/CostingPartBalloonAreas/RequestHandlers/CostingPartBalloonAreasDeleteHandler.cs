using Serenity.Services;
using MyRequest = Serenity.Services.DeleteRequest;
using MyResponse = Serenity.Services.DeleteResponse;
using MyRow = DSRFQ.Costing.CostingPartBalloonAreasRow;

namespace DSRFQ.Costing;

public interface ICostingPartBalloonAreasDeleteHandler : IDeleteHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartBalloonAreasDeleteHandler(IRequestContext context)
    : DeleteRequestHandler<MyRow, MyRequest, MyResponse>(context), ICostingPartBalloonAreasDeleteHandler
{
}
