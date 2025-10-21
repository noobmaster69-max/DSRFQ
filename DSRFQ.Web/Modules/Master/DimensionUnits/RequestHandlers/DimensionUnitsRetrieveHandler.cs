using Serenity.Services;
using MyRequest = Serenity.Services.RetrieveRequest;
using MyResponse = Serenity.Services.RetrieveResponse<DSRFQ.Master.DimensionUnitsRow>;
using MyRow = DSRFQ.Master.DimensionUnitsRow;

namespace DSRFQ.Master;

public interface IDimensionUnitsRetrieveHandler : IRetrieveHandler<MyRow, MyRequest, MyResponse> { }

public class DimensionUnitsRetrieveHandler : RetrieveRequestHandler<MyRow, MyRequest, MyResponse>, IDimensionUnitsRetrieveHandler
{
    public DimensionUnitsRetrieveHandler(IRequestContext context)
            : base(context)
    {
    }
}