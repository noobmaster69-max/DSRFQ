using Microsoft.AspNetCore.Mvc;
using Serenity.Web;

namespace DSRFQ.Material.Pages;

[PageAuthorize(typeof(MaterialsRow))]
public class MaterialsPage : Controller
{
    [Route("Material/Materials")]
    public ActionResult Index()
    {
        return this.GridPage<MaterialsRow>("@/Material/Materials/MaterialsPage");
    }
}