using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Master.SurfaceTreatmentProcessCostsRow>;
using MyRow = DSRFQ.Master.SurfaceTreatmentProcessCostsRow;

namespace DSRFQ.Master;

public interface ISurfaceTreatmentProcessCostsListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class SurfaceTreatmentProcessCostsListHandler : ListRequestHandler<MyRow, MyRequest, MyResponse>, ISurfaceTreatmentProcessCostsListHandler
{
    public SurfaceTreatmentProcessCostsListHandler(IRequestContext context)
            : base(context)
    {
    }
}