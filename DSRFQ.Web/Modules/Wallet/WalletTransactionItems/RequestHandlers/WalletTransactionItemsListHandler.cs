using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Wallet.WalletTransactionItemsRow>;
using MyRow = DSRFQ.Wallet.WalletTransactionItemsRow;

namespace DSRFQ.Wallet;

public interface IWalletTransactionItemsListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class WalletTransactionItemsListHandler : ListRequestHandler<MyRow, MyRequest, MyResponse>, IWalletTransactionItemsListHandler
{
    public WalletTransactionItemsListHandler(IRequestContext context)
            : base(context)
    {
    }
}