using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Master.SettingsRow>;
using MyRow = DSRFQ.Master.SettingsRow;

namespace DSRFQ.Master;

public interface ISettingsListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class SettingsListHandler : ListRequestHandler<MyRow, MyRequest, MyResponse>,
    ISettingsListHandler
{
    public SettingsListHandler(IRequestContext context)
        : base(context)
    {
    }
}
