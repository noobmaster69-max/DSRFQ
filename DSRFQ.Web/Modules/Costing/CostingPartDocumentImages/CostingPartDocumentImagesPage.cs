using Microsoft.AspNetCore.Mvc;
using Serenity.Web;

namespace DSRFQ.Costing.Pages;

[PageAuthorize(typeof(CostingPartDocumentImagesRow))]
public class CostingPartDocumentImagesPage : Controller
{
    [Route("Costing/CostingPartDocumentImages")]
    public ActionResult Index()
    {
        return this.GridPage<CostingPartDocumentImagesRow>("@/Costing/CostingPartDocumentImages/CostingPartDocumentImagesPage");
    }
}