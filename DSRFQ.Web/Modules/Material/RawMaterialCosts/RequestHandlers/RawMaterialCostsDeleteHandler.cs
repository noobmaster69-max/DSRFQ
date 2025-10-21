using Serenity.Services;
using MyRequest = Serenity.Services.DeleteRequest;
using MyResponse = Serenity.Services.DeleteResponse;
using MyRow = DSRFQ.Material.RawMaterialCostsRow;

namespace DSRFQ.Material;

public interface IRawMaterialCostsDeleteHandler : IDeleteHandler<MyRow, MyRequest, MyResponse> { }

public class RawMaterialCostsDeleteHandler : DeleteRequestHandler<MyRow, MyRequest, MyResponse>, IRawMaterialCostsDeleteHandler
{
    public RawMaterialCostsDeleteHandler(IRequestContext context)
            : base(context)
    {
    }
}