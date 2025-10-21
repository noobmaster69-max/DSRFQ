using Serenity.Services;
using MyRequest = Serenity.Services.SaveRequest<DSRFQ.Wallet.WalletTransactionsRow>;
using MyResponse = Serenity.Services.SaveResponse;
using MyRow = DSRFQ.Wallet.WalletTransactionsRow;

namespace DSRFQ.Wallet;

public interface IWalletTransactionsSaveHandler : ISaveHandler<MyRow, MyRequest, MyResponse> { }

public class WalletTransactionsSaveHandler : SaveRequestHandler<MyRow, MyRequest, MyResponse>, IWalletTransactionsSaveHandler
{
    public WalletTransactionsSaveHandler(IRequestContext context)
            : base(context)
    {
    }
}