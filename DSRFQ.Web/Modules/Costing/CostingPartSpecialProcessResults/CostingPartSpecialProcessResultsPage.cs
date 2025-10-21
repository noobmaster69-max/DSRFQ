using Microsoft.AspNetCore.Mvc;
using Serenity.Web;

namespace DSRFQ.Costing.Pages;

[PageAuthorize(typeof(CostingPartSpecialProcessResultsRow))]
public class CostingPartSpecialProcessResultsPage : Controller
{
    [Route("Costing/CostingPartSpecialProcessResults")]
    public ActionResult Index()
    {
        return this.GridPage<CostingPartSpecialProcessResultsRow>("@/Costing/CostingPartSpecialProcessResults/CostingPartSpecialProcessResultsPage");
    }
}