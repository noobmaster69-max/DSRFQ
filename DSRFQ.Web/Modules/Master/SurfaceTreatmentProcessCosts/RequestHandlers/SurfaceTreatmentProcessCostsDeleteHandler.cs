using Serenity.Services;
using MyRequest = Serenity.Services.DeleteRequest;
using MyResponse = Serenity.Services.DeleteResponse;
using MyRow = DSRFQ.Master.SurfaceTreatmentProcessCostsRow;

namespace DSRFQ.Master;

public interface ISurfaceTreatmentProcessCostsDeleteHandler : IDeleteHandler<MyRow, MyRequest, MyResponse> { }

public class SurfaceTreatmentProcessCostsDeleteHandler : DeleteRequestHandler<MyRow, MyRequest, MyResponse>, ISurfaceTreatmentProcessCostsDeleteHandler
{
    public SurfaceTreatmentProcessCostsDeleteHandler(IRequestContext context)
            : base(context)
    {
    }
}