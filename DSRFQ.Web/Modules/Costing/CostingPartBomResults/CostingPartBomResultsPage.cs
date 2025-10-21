using Microsoft.AspNetCore.Mvc;
using Serenity.Web;

namespace DSRFQ.Costing.Pages;

[PageAuthorize(typeof(CostingPartBomResultsRow))]
public class CostingPartBomResultsPage : Controller
{
    [Route("Costing/CostingPartBomResults")]
    public ActionResult Index()
    {
        return this.GridPage<CostingPartBomResultsRow>("@/Costing/CostingPartBomResults/CostingPartBomResultsPage");
    }
}