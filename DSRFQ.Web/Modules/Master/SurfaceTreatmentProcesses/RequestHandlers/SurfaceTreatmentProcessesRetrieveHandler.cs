using Serenity.Services;
using MyRequest = Serenity.Services.RetrieveRequest;
using MyResponse = Serenity.Services.RetrieveResponse<DSRFQ.Master.SurfaceTreatmentProcessesRow>;
using MyRow = DSRFQ.Master.SurfaceTreatmentProcessesRow;

namespace DSRFQ.Master;

public interface ISurfaceTreatmentProcessesRetrieveHandler : IRetrieveHandler<MyRow, MyRequest, MyResponse> { }

public class SurfaceTreatmentProcessesRetrieveHandler : RetrieveRequestHandler<MyRow, MyRequest, MyResponse>, ISurfaceTreatmentProcessesRetrieveHandler
{
    public SurfaceTreatmentProcessesRetrieveHandler(IRequestContext context)
            : base(context)
    {
    }
}