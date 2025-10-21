using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Master.DimensionUnitsRow>;
using MyRow = DSRFQ.Master.DimensionUnitsRow;

namespace DSRFQ.Master;

public interface IDimensionUnitsListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class DimensionUnitsListHandler : ListRequestHandler<MyRow, MyRequest, MyResponse>, IDimensionUnitsListHandler
{
    public DimensionUnitsListHandler(IRequestContext context)
            : base(context)
    {
    }
}