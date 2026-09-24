using Microsoft.AspNetCore.Mvc;
using Serenity.Web;

namespace DSRFQ.Costing.Pages;

/// <summary>
/// Full-page workspace for a single costing part: 2D drawing, 3D model and
/// (from phase 3) ballooning, all on one stage.
/// </summary>
[PageAuthorize(typeof(CostingPartsRow))]
public class CostingWorkspacePage : Controller
{
    [Route("Costing/Workspace/{id:int}")]
    public ActionResult Index(int id)
    {
        // Referenced by path rather than through the generated MVC constants so
        // this compiles on a clean checkout, before sergen has seen the view.
        return View("~/Modules/Costing/Workspace/CostingWorkspaceIndex.cshtml", id);
    }
}
