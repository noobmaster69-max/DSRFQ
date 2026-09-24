using Microsoft.AspNetCore.Mvc;
using Serenity.Web;

namespace DSRFQ.Costing.Pages;

/// <summary>
/// What the pipeline is working on and what is waiting behind it.
/// </summary>
[PageAuthorize(typeof(CostingPartQueueRow))]
public class CostingPartQueuePage : Controller
{
    [Route("Costing/Queue")]
    public ActionResult Index()
    {
        return this.GridPage<CostingPartQueueRow>(
            "@/Costing/CostingPartQueue/CostingPartQueuePage");
    }
}
