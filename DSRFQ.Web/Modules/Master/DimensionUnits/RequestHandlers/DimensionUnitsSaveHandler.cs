using Serenity.Services;
using MyRequest = Serenity.Services.SaveRequest<DSRFQ.Master.DimensionUnitsRow>;
using MyResponse = Serenity.Services.SaveResponse;
using MyRow = DSRFQ.Master.DimensionUnitsRow;

namespace DSRFQ.Master;

public interface IDimensionUnitsSaveHandler : ISaveHandler<MyRow, MyRequest, MyResponse> { }

public class DimensionUnitsSaveHandler : SaveRequestHandler<MyRow, MyRequest, MyResponse>, IDimensionUnitsSaveHandler
{
    public DimensionUnitsSaveHandler(IRequestContext context)
            : base(context)
    {
    }
}