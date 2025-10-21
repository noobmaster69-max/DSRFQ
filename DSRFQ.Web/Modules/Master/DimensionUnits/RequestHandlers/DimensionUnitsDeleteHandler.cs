using Serenity.Services;
using MyRequest = Serenity.Services.DeleteRequest;
using MyResponse = Serenity.Services.DeleteResponse;
using MyRow = DSRFQ.Master.DimensionUnitsRow;

namespace DSRFQ.Master;

public interface IDimensionUnitsDeleteHandler : IDeleteHandler<MyRow, MyRequest, MyResponse> { }

public class DimensionUnitsDeleteHandler : DeleteRequestHandler<MyRow, MyRequest, MyResponse>, IDimensionUnitsDeleteHandler
{
    public DimensionUnitsDeleteHandler(IRequestContext context)
            : base(context)
    {
    }
}