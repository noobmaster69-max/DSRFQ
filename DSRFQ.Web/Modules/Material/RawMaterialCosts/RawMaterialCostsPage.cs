using Microsoft.AspNetCore.Mvc;
using Serenity.Web;

namespace DSRFQ.Material.Pages;

[PageAuthorize(typeof(RawMaterialCostsRow))]
public class RawMaterialCostsPage : Controller
{
    [Route("Material/RawMaterialCosts")]
    public ActionResult Index()
    {
        return this.GridPage<RawMaterialCostsRow>("@/Material/RawMaterialCosts/RawMaterialCostsPage");
    }
}