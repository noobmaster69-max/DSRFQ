using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Wallet.WalletTransactionsRow>;
using MyRow = DSRFQ.Wallet.WalletTransactionsRow;

namespace DSRFQ.Wallet;

public interface IWalletTransactionsListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class WalletTransactionsListHandler : ListRequestHandler<MyRow, MyRequest, MyResponse>, IWalletTransactionsListHandler
{
    public WalletTransactionsListHandler(IRequestContext context)
            : base(context)
    {
    }
}