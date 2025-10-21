using Serenity.Services;
using MyRequest = Serenity.Services.SaveRequest<DSRFQ.Material.RawMaterialCostsRow>;
using MyResponse = Serenity.Services.SaveResponse;
using MyRow = DSRFQ.Material.RawMaterialCostsRow;

namespace DSRFQ.Material;

public interface IRawMaterialCostsSaveHandler : ISaveHandler<MyRow, MyRequest, MyResponse> { }

public class RawMaterialCostsSaveHandler : SaveRequestHandler<MyRow, MyRequest, MyResponse>, IRawMaterialCostsSaveHandler
{
    public RawMaterialCostsSaveHandler(IRequestContext context)
            : base(context)
    {
    }
}