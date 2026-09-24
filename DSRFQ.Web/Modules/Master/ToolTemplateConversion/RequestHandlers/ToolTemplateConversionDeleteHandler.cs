using Serenity.Services;
using MyRequest = Serenity.Services.DeleteRequest;
using MyResponse = Serenity.Services.DeleteResponse;
using MyRow = DSRFQ.Master.ToolTemplateConversionRow;

namespace DSRFQ.Master;

public interface IToolTemplateConversionDeleteHandler : IDeleteHandler<MyRow, MyRequest, MyResponse> { }

public class ToolTemplateConversionDeleteHandler : DeleteRequestHandler<MyRow, MyRequest, MyResponse>,
    IToolTemplateConversionDeleteHandler
{
    public ToolTemplateConversionDeleteHandler(IRequestContext context)
        : base(context)
    {
    }
}
