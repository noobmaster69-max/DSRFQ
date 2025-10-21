using Microsoft.AspNetCore.Mvc;
using Serenity.Web;

namespace DSRFQ.Master.Pages;

[PageAuthorize(typeof(CurrenciesRow))]
public class CurrenciesPage : Controller
{
    [Route("Master/Currencies")]
    public ActionResult Index()
    {
        return this.GridPage<CurrenciesRow>("@/Master/Currencies/CurrenciesPage");
    }
}