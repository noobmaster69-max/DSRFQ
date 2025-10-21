using Serenity.Services;
using MyRequest = Serenity.Services.DeleteRequest;
using MyResponse = Serenity.Services.DeleteResponse;
using MyRow = DSRFQ.Master.CurrenciesRow;

namespace DSRFQ.Master;

public interface ICurrenciesDeleteHandler : IDeleteHandler<MyRow, MyRequest, MyResponse> { }

public class CurrenciesDeleteHandler : DeleteRequestHandler<MyRow, MyRequest, MyResponse>, ICurrenciesDeleteHandler
{
    public CurrenciesDeleteHandler(IRequestContext context)
            : base(context)
    {
    }
}