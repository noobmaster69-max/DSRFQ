using Microsoft.AspNetCore.Mvc;
using Serenity.Web;

namespace DSRFQ.Master.Pages;

[PageAuthorize(typeof(DimensionUnitsRow))]
public class DimensionUnitsPage : Controller
{
    [Route("Master/DimensionUnits")]
    public ActionResult Index()
    {
        return this.GridPage<DimensionUnitsRow>("@/Master/DimensionUnits/DimensionUnitsPage");
    }
}