using Microsoft.AspNetCore.Mvc;
using Serenity.Web;

namespace DSRFQ.Costing.Pages;

/// <summary>
/// Search every uploaded file by what the pipeline read out of it.
/// </summary>
[PageAuthorize(typeof(CostingPartFilesRow))]
public class CostingPartFilesPage : Controller
{
    [Route("Costing/Files")]
    public ActionResult Index()
    {
        return this.GridPage<CostingPartFilesRow>(
            "@/Costing/CostingPartFiles/CostingPartFilesPage");
    }
}
