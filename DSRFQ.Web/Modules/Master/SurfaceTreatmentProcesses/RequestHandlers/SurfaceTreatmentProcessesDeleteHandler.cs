using Serenity.Services;
using MyRequest = Serenity.Services.DeleteRequest;
using MyResponse = Serenity.Services.DeleteResponse;
using MyRow = DSRFQ.Master.SurfaceTreatmentProcessesRow;

namespace DSRFQ.Master;

public interface ISurfaceTreatmentProcessesDeleteHandler : IDeleteHandler<MyRow, MyRequest, MyResponse> { }

public class SurfaceTreatmentProcessesDeleteHandler : DeleteRequestHandler<MyRow, MyRequest, MyResponse>, ISurfaceTreatmentProcessesDeleteHandler
{
    public SurfaceTreatmentProcessesDeleteHandler(IRequestContext context)
            : base(context)
    {
    }
}