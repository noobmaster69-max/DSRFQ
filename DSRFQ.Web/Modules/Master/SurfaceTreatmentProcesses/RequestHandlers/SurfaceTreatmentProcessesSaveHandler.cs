using Serenity.Services;
using MyRequest = Serenity.Services.SaveRequest<DSRFQ.Master.SurfaceTreatmentProcessesRow>;
using MyResponse = Serenity.Services.SaveResponse;
using MyRow = DSRFQ.Master.SurfaceTreatmentProcessesRow;

namespace DSRFQ.Master;

public interface ISurfaceTreatmentProcessesSaveHandler : ISaveHandler<MyRow, MyRequest, MyResponse> { }

public class SurfaceTreatmentProcessesSaveHandler : SaveRequestHandler<MyRow, MyRequest, MyResponse>, ISurfaceTreatmentProcessesSaveHandler
{
    public SurfaceTreatmentProcessesSaveHandler(IRequestContext context)
            : base(context)
    {
    }
}