using Microsoft.AspNetCore.Mvc;
using Serenity.Web;

namespace DSRFQ.Wallet.Pages;

[PageAuthorize(typeof(WalletTransactionItemsRow))]
public class WalletTransactionItemsPage : Controller
{
    [Route("Wallet/WalletTransactionItems")]
    public ActionResult Index()
    {
        return this.GridPage<WalletTransactionItemsRow>("@/Wallet/WalletTransactionItems/WalletTransactionItemsPage");
    }
}