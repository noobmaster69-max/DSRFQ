using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Master.ToolTemplateConversionRow>;
using MyRow = DSRFQ.Master.ToolTemplateConversionRow;

namespace DSRFQ.Master;

public interface IToolTemplateConversionListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class ToolTemplateConversionListHandler : ListRequestHandler<MyRow, MyRequest, MyResponse>,
    IToolTemplateConversionListHandler
{
    public ToolTemplateConversionListHandler(IRequestContext context)
        : base(context)
    {
    }
}
