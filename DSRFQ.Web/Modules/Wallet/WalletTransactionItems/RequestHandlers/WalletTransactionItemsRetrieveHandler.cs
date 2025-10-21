using Serenity.Services;
using MyRequest = Serenity.Services.RetrieveRequest;
using MyResponse = Serenity.Services.RetrieveResponse<DSRFQ.Wallet.WalletTransactionItemsRow>;
using MyRow = DSRFQ.Wallet.WalletTransactionItemsRow;

namespace DSRFQ.Wallet;

public interface IWalletTransactionItemsRetrieveHandler : IRetrieveHandler<MyRow, MyRequest, MyResponse> { }

public class WalletTransactionItemsRetrieveHandler : RetrieveRequestHandler<MyRow, MyRequest, MyResponse>, IWalletTransactionItemsRetrieveHandler
{
    public WalletTransactionItemsRetrieveHandler(IRequestContext context)
            : base(context)
    {
    }
}