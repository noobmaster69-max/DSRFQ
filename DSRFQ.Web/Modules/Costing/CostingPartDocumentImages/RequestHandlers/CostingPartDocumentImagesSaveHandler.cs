using Serenity.Services;
using MyRequest = Serenity.Services.SaveRequest<DSRFQ.Costing.CostingPartDocumentImagesRow>;
using MyResponse = Serenity.Services.SaveResponse;
using MyRow = DSRFQ.Costing.CostingPartDocumentImagesRow;

namespace DSRFQ.Costing;

public interface ICostingPartDocumentImagesSaveHandler : ISaveHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartDocumentImagesSaveHandler : SaveRequestHandler<MyRow, MyRequest, MyResponse>, ICostingPartDocumentImagesSaveHandler
{
    public CostingPartDocumentImagesSaveHandler(IRequestContext context)
            : base(context)
    {
    }
}