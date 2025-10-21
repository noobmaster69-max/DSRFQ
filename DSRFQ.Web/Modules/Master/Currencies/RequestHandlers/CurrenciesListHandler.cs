using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Master.CurrenciesRow>;
using MyRow = DSRFQ.Master.CurrenciesRow;

namespace DSRFQ.Master;

public interface ICurrenciesListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class CurrenciesListHandler : ListRequestHandler<MyRow, MyRequest, MyResponse>, ICurrenciesListHandler
{
    public CurrenciesListHandler(IRequestContext context)
            : base(context)
    {
    }
}