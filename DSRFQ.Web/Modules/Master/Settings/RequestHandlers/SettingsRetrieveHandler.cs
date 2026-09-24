using Serenity.Services;
using MyRequest = Serenity.Services.RetrieveRequest;
using MyResponse = Serenity.Services.RetrieveResponse<DSRFQ.Master.SettingsRow>;
using MyRow = DSRFQ.Master.SettingsRow;

namespace DSRFQ.Master;

public interface ISettingsRetrieveHandler : IRetrieveHandler<MyRow, MyRequest, MyResponse> { }

public class SettingsRetrieveHandler : RetrieveRequestHandler<MyRow, MyRequest, MyResponse>,
    ISettingsRetrieveHandler
{
    public SettingsRetrieveHandler(IRequestContext context)
        : base(context)
    {
    }
}
