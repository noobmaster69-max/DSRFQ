using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Master.VolumeUnitsRow>;
using MyRow = DSRFQ.Master.VolumeUnitsRow;

namespace DSRFQ.Master;

public interface IVolumeUnitsListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class VolumeUnitsListHandler : ListRequestHandler<MyRow, MyRequest, MyResponse>, IVolumeUnitsListHandler
{
    public VolumeUnitsListHandler(IRequestContext context)
            : base(context)
    {
    }
}