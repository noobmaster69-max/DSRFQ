using Serenity.Services;
using MyRequest = Serenity.Services.RetrieveRequest;
using MyResponse = Serenity.Services.RetrieveResponse<DSRFQ.Master.SurfaceTreatmentProcessCostsRow>;
using MyRow = DSRFQ.Master.SurfaceTreatmentProcessCostsRow;

namespace DSRFQ.Master;

public interface ISurfaceTreatmentProcessCostsRetrieveHandler : IRetrieveHandler<MyRow, MyRequest, MyResponse> { }

public class SurfaceTreatmentProcessCostsRetrieveHandler : RetrieveRequestHandler<MyRow, MyRequest, MyResponse>, ISurfaceTreatmentProcessCostsRetrieveHandler
{
    public SurfaceTreatmentProcessCostsRetrieveHandler(IRequestContext context)
            : base(context)
    {
    }
}