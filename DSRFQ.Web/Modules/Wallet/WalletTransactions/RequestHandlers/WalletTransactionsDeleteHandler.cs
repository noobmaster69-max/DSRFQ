using Serenity.Services;
using MyRequest = Serenity.Services.DeleteRequest;
using MyResponse = Serenity.Services.DeleteResponse;
using MyRow = DSRFQ.Wallet.WalletTransactionsRow;

namespace DSRFQ.Wallet;

public interface IWalletTransactionsDeleteHandler : IDeleteHandler<MyRow, MyRequest, MyResponse> { }

public class WalletTransactionsDeleteHandler : DeleteRequestHandler<MyRow, MyRequest, MyResponse>, IWalletTransactionsDeleteHandler
{
    public WalletTransactionsDeleteHandler(IRequestContext context)
            : base(context)
    {
    }
}