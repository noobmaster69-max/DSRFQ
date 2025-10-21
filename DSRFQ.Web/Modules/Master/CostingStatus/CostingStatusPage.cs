using Microsoft.AspNetCore.Mvc;
using Serenity.Web;

namespace DSRFQ.Master.Pages;

[PageAuthorize(typeof(CostingStatusRow))]
public class CostingStatusPage : Controller
{
    [Route("Master/CostingStatus")]
    public ActionResult Index()
    {
        return this.GridPage<CostingStatusRow>("@/Master/CostingStatus/CostingStatusPage");
    }
}