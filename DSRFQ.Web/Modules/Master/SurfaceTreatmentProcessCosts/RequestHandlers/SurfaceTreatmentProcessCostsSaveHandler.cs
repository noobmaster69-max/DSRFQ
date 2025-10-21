using Serenity.Services;
using MyRequest = Serenity.Services.SaveRequest<DSRFQ.Master.SurfaceTreatmentProcessCostsRow>;
using MyResponse = Serenity.Services.SaveResponse;
using MyRow = DSRFQ.Master.SurfaceTreatmentProcessCostsRow;

namespace DSRFQ.Master;

public interface ISurfaceTreatmentProcessCostsSaveHandler : ISaveHandler<MyRow, MyRequest, MyResponse> { }

public class SurfaceTreatmentProcessCostsSaveHandler : SaveRequestHandler<MyRow, MyRequest, MyResponse>, ISurfaceTreatmentProcessCostsSaveHandler
{
    public SurfaceTreatmentProcessCostsSaveHandler(IRequestContext context)
            : base(context)
    {
    }
}