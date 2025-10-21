using Serenity.Services;
using MyRequest = Serenity.Services.SaveRequest<DSRFQ.Master.WeightUnitsRow>;
using MyResponse = Serenity.Services.SaveResponse;
using MyRow = DSRFQ.Master.WeightUnitsRow;

namespace DSRFQ.Master;

public interface IWeightUnitsSaveHandler : ISaveHandler<MyRow, MyRequest, MyResponse> { }

public class WeightUnitsSaveHandler : SaveRequestHandler<MyRow, MyRequest, MyResponse>, IWeightUnitsSaveHandler
{
    public WeightUnitsSaveHandler(IRequestContext context)
            : base(context)
    {
    }
}