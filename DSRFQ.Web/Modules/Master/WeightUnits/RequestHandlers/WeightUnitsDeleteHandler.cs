using Serenity.Services;
using MyRequest = Serenity.Services.DeleteRequest;
using MyResponse = Serenity.Services.DeleteResponse;
using MyRow = DSRFQ.Master.WeightUnitsRow;

namespace DSRFQ.Master;

public interface IWeightUnitsDeleteHandler : IDeleteHandler<MyRow, MyRequest, MyResponse> { }

public class WeightUnitsDeleteHandler : DeleteRequestHandler<MyRow, MyRequest, MyResponse>, IWeightUnitsDeleteHandler
{
    public WeightUnitsDeleteHandler(IRequestContext context)
            : base(context)
    {
    }
}