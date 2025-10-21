using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Master.SurfaceTreatmentProcessesRow>;
using MyRow = DSRFQ.Master.SurfaceTreatmentProcessesRow;

namespace DSRFQ.Master;

public interface ISurfaceTreatmentProcessesListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class SurfaceTreatmentProcessesListHandler : ListRequestHandler<MyRow, MyRequest, MyResponse>, ISurfaceTreatmentProcessesListHandler
{
    public SurfaceTreatmentProcessesListHandler(IRequestContext context)
            : base(context)
    {
    }
}