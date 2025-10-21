using Serenity.Services;
using MyRequest = Serenity.Services.SaveRequest<DSRFQ.Master.VolumeUnitsRow>;
using MyResponse = Serenity.Services.SaveResponse;
using MyRow = DSRFQ.Master.VolumeUnitsRow;

namespace DSRFQ.Master;

public interface IVolumeUnitsSaveHandler : ISaveHandler<MyRow, MyRequest, MyResponse> { }

public class VolumeUnitsSaveHandler : SaveRequestHandler<MyRow, MyRequest, MyResponse>, IVolumeUnitsSaveHandler
{
    public VolumeUnitsSaveHandler(IRequestContext context)
            : base(context)
    {
    }
}