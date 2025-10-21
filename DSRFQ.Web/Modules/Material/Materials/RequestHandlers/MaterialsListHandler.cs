using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Material.MaterialsRow>;
using MyRow = DSRFQ.Material.MaterialsRow;

namespace DSRFQ.Material;

public interface IMaterialsListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class MaterialsListHandler : ListRequestHandler<MyRow, MyRequest, MyResponse>, IMaterialsListHandler
{
    public MaterialsListHandler(IRequestContext context)
            : base(context)
    {
    }
}