using Serenity.Services;
using MyRequest = Serenity.Services.DeleteRequest;
using MyResponse = Serenity.Services.DeleteResponse;
using MyRow = DSRFQ.Master.VolumeUnitsRow;

namespace DSRFQ.Master;

public interface IVolumeUnitsDeleteHandler : IDeleteHandler<MyRow, MyRequest, MyResponse> { }

public class VolumeUnitsDeleteHandler : DeleteRequestHandler<MyRow, MyRequest, MyResponse>, IVolumeUnitsDeleteHandler
{
    public VolumeUnitsDeleteHandler(IRequestContext context)
            : base(context)
    {
    }
}