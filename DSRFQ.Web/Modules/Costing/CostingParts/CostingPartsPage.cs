using Microsoft.AspNetCore.Mvc;
using Serenity.Web;

namespace DSRFQ.Costing.Pages;

[PageAuthorize(typeof(CostingPartsRow))]
public class CostingPartsPage : Controller
{
    [Route("Costing/CostingParts")]
    public ActionResult Index()
    {
        return this.GridPage<CostingPartsRow>("@/Costing/CostingParts/CostingPartsPage");
    }
}