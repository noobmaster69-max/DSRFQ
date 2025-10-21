using Serenity.Services;
using MyRequest = Serenity.Services.RetrieveRequest;
using MyResponse = Serenity.Services.RetrieveResponse<DSRFQ.Master.VolumeUnitsRow>;
using MyRow = DSRFQ.Master.VolumeUnitsRow;

namespace DSRFQ.Master;

public interface IVolumeUnitsRetrieveHandler : IRetrieveHandler<MyRow, MyRequest, MyResponse> { }

public class VolumeUnitsRetrieveHandler : RetrieveRequestHandler<MyRow, MyRequest, MyResponse>, IVolumeUnitsRetrieveHandler
{
    public VolumeUnitsRetrieveHandler(IRequestContext context)
            : base(context)
    {
    }
}