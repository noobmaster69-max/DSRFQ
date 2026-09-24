using Serenity.Services;
using MyRequest = Serenity.Services.RetrieveRequest;
using MyResponse = Serenity.Services.RetrieveResponse<DSRFQ.Master.ToolTemplateConversionRow>;
using MyRow = DSRFQ.Master.ToolTemplateConversionRow;

namespace DSRFQ.Master;

public interface IToolTemplateConversionRetrieveHandler : IRetrieveHandler<MyRow, MyRequest, MyResponse> { }

public class ToolTemplateConversionRetrieveHandler : RetrieveRequestHandler<MyRow, MyRequest, MyResponse>,
    IToolTemplateConversionRetrieveHandler
{
    public ToolTemplateConversionRetrieveHandler(IRequestContext context)
        : base(context)
    {
    }
}
