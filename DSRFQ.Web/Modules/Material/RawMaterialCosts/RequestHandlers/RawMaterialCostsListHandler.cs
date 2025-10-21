using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Material.RawMaterialCostsRow>;
using MyRow = DSRFQ.Material.RawMaterialCostsRow;

namespace DSRFQ.Material;

public interface IRawMaterialCostsListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class RawMaterialCostsListHandler : ListRequestHandler<MyRow, MyRequest, MyResponse>, IRawMaterialCostsListHandler
{
    public RawMaterialCostsListHandler(IRequestContext context)
            : base(context)
    {
    }
}