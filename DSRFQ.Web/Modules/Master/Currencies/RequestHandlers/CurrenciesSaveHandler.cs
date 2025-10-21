using Serenity.Services;
using MyRequest = Serenity.Services.SaveRequest<DSRFQ.Master.CurrenciesRow>;
using MyResponse = Serenity.Services.SaveResponse;
using MyRow = DSRFQ.Master.CurrenciesRow;

namespace DSRFQ.Master;

public interface ICurrenciesSaveHandler : ISaveHandler<MyRow, MyRequest, MyResponse> { }

public class CurrenciesSaveHandler : SaveRequestHandler<MyRow, MyRequest, MyResponse>, ICurrenciesSaveHandler
{
    public CurrenciesSaveHandler(IRequestContext context)
            : base(context)
    {
    }
}