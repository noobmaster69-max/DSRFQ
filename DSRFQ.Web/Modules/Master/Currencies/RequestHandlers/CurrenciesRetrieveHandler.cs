using Serenity.Services;
using MyRequest = Serenity.Services.RetrieveRequest;
using MyResponse = Serenity.Services.RetrieveResponse<DSRFQ.Master.CurrenciesRow>;
using MyRow = DSRFQ.Master.CurrenciesRow;

namespace DSRFQ.Master;

public interface ICurrenciesRetrieveHandler : IRetrieveHandler<MyRow, MyRequest, MyResponse> { }

public class CurrenciesRetrieveHandler : RetrieveRequestHandler<MyRow, MyRequest, MyResponse>, ICurrenciesRetrieveHandler
{
    public CurrenciesRetrieveHandler(IRequestContext context)
            : base(context)
    {
    }
}