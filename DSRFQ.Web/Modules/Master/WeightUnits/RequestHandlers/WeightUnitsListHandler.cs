using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Master.WeightUnitsRow>;
using MyRow = DSRFQ.Master.WeightUnitsRow;

namespace DSRFQ.Master;

public interface IWeightUnitsListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class WeightUnitsListHandler : ListRequestHandler<MyRow, MyRequest, MyResponse>, IWeightUnitsListHandler
{
    public WeightUnitsListHandler(IRequestContext context)
            : base(context)
    {
    }
}