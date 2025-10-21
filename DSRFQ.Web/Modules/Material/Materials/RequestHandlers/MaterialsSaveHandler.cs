using Serenity.Services;
using MyRequest = Serenity.Services.SaveRequest<DSRFQ.Material.MaterialsRow>;
using MyResponse = Serenity.Services.SaveResponse;
using MyRow = DSRFQ.Material.MaterialsRow;

namespace DSRFQ.Material;

public interface IMaterialsSaveHandler : ISaveHandler<MyRow, MyRequest, MyResponse> { }

public class MaterialsSaveHandler : SaveRequestHandler<MyRow, MyRequest, MyResponse>, IMaterialsSaveHandler
{
    public MaterialsSaveHandler(IRequestContext context)
            : base(context)
    {
    }
}