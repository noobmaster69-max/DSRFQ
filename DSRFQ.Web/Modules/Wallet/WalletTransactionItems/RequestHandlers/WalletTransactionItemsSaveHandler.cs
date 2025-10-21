using Serenity.Services;
using MyRequest = Serenity.Services.SaveRequest<DSRFQ.Wallet.WalletTransactionItemsRow>;
using MyResponse = Serenity.Services.SaveResponse;
using MyRow = DSRFQ.Wallet.WalletTransactionItemsRow;

namespace DSRFQ.Wallet;

public interface IWalletTransactionItemsSaveHandler : ISaveHandler<MyRow, MyRequest, MyResponse> { }

public class WalletTransactionItemsSaveHandler : SaveRequestHandler<MyRow, MyRequest, MyResponse>, IWalletTransactionItemsSaveHandler
{
    public WalletTransactionItemsSaveHandler(IRequestContext context)
            : base(context)
    {
    }
}