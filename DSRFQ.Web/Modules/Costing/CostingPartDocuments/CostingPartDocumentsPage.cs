using Microsoft.AspNetCore.Mvc;
using Serenity.Web;

namespace DSRFQ.Costing.Pages;

[PageAuthorize(typeof(CostingPartDocumentsRow))]
public class CostingPartDocumentsPage : Controller
{
    [Route("Costing/CostingPartDocuments")]
    public ActionResult Index()
    {
        return this.GridPage<CostingPartDocumentsRow>("@/Costing/CostingPartDocuments/CostingPartDocumentsPage");
    }
}