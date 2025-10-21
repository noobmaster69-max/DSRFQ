using Serenity.Services;
using MyRequest = Serenity.Services.RetrieveRequest;
using MyResponse = Serenity.Services.RetrieveResponse<DSRFQ.Master.WeightUnitsRow>;
using MyRow = DSRFQ.Master.WeightUnitsRow;

namespace DSRFQ.Master;

public interface IWeightUnitsRetrieveHandler : IRetrieveHandler<MyRow, MyRequest, MyResponse> { }

public class WeightUnitsRetrieveHandler : RetrieveRequestHandler<MyRow, MyRequest, MyResponse>, IWeightUnitsRetrieveHandler
{
    public WeightUnitsRetrieveHandler(IRequestContext context)
            : base(context)
    {
    }
}