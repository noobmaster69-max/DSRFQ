using Serenity.Services;
using MyRequest = Serenity.Services.RetrieveRequest;
using MyResponse = Serenity.Services.RetrieveResponse<DSRFQ.Material.RawMaterialCostsRow>;
using MyRow = DSRFQ.Material.RawMaterialCostsRow;

namespace DSRFQ.Material;

public interface IRawMaterialCostsRetrieveHandler : IRetrieveHandler<MyRow, MyRequest, MyResponse> { }

public class RawMaterialCostsRetrieveHandler : RetrieveRequestHandler<MyRow, MyRequest, MyResponse>, IRawMaterialCostsRetrieveHandler
{
    public RawMaterialCostsRetrieveHandler(IRequestContext context)
            : base(context)
    {
    }
}