using Serenity.Services;
using MyRequest = Serenity.Services.RetrieveRequest;
using MyResponse = Serenity.Services.RetrieveResponse<DSRFQ.Wallet.WalletTransactionsRow>;
using MyRow = DSRFQ.Wallet.WalletTransactionsRow;

namespace DSRFQ.Wallet;

public interface IWalletTransactionsRetrieveHandler : IRetrieveHandler<MyRow, MyRequest, MyResponse> { }

public class WalletTransactionsRetrieveHandler : RetrieveRequestHandler<MyRow, MyRequest, MyResponse>, IWalletTransactionsRetrieveHandler
{
    public WalletTransactionsRetrieveHandler(IRequestContext context)
            : base(context)
    {
    }
}