using Serenity.Services;
using MyRequest = Serenity.Services.DeleteRequest;
using MyResponse = Serenity.Services.DeleteResponse;
using MyRow = DSRFQ.Material.MaterialsRow;

namespace DSRFQ.Material;

public interface IMaterialsDeleteHandler : IDeleteHandler<MyRow, MyRequest, MyResponse> { }

public class MaterialsDeleteHandler : DeleteRequestHandler<MyRow, MyRequest, MyResponse>, IMaterialsDeleteHandler
{
    public MaterialsDeleteHandler(IRequestContext context)
            : base(context)
    {
    }
}