using Serenity.Services;
using MyRequest = Serenity.Services.DeleteRequest;
using MyResponse = Serenity.Services.DeleteResponse;
using MyRow = DSRFQ.Wallet.WalletTransactionItemsRow;

namespace DSRFQ.Wallet;

public interface IWalletTransactionItemsDeleteHandler : IDeleteHandler<MyRow, MyRequest, MyResponse> { }

public class WalletTransactionItemsDeleteHandler : DeleteRequestHandler<MyRow, MyRequest, MyResponse>, IWalletTransactionItemsDeleteHandler
{
    public WalletTransactionItemsDeleteHandler(IRequestContext context)
            : base(context)
    {
    }
}