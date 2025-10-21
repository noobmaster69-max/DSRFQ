using Microsoft.AspNetCore.Mvc;
using Serenity.Web;

namespace DSRFQ.Costing.Pages;

[PageAuthorize(typeof(CostingPartCostingResultsRow))]
public class CostingPartCostingResultsPage : Controller
{
    [Route("Costing/CostingPartCostingResults")]
    public ActionResult Index()
    {
        return this.GridPage<CostingPartCostingResultsRow>("@/Costing/CostingPartCostingResults/CostingPartCostingResultsPage");
    }
}