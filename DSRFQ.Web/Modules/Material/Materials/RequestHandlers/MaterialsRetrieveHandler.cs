using Serenity.Services;
using MyRequest = Serenity.Services.RetrieveRequest;
using MyResponse = Serenity.Services.RetrieveResponse<DSRFQ.Material.MaterialsRow>;
using MyRow = DSRFQ.Material.MaterialsRow;

namespace DSRFQ.Material;

public interface IMaterialsRetrieveHandler : IRetrieveHandler<MyRow, MyRequest, MyResponse> { }

public class MaterialsRetrieveHandler : RetrieveRequestHandler<MyRow, MyRequest, MyResponse>, IMaterialsRetrieveHandler
{
    public MaterialsRetrieveHandler(IRequestContext context)
            : base(context)
    {
    }
}