using Microsoft.AspNetCore.Mvc;
using Serenity.Web;

namespace DSRFQ.Wallet.Pages;

[PageAuthorize(typeof(WalletTransactionsRow))]
public class WalletTransactionsPage : Controller
{
    [Route("Wallet/WalletTransactions")]
    public ActionResult Index()
    {
        return this.GridPage<WalletTransactionsRow>("@/Wallet/WalletTransactions/WalletTransactionsPage");
    }
}