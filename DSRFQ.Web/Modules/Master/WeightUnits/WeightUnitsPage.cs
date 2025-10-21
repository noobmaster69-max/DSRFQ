using Microsoft.AspNetCore.Mvc;
using Serenity.Web;

namespace DSRFQ.Master.Pages;

[PageAuthorize(typeof(WeightUnitsRow))]
public class WeightUnitsPage : Controller
{
    [Route("Master/WeightUnits")]
    public ActionResult Index()
    {
        return this.GridPage<WeightUnitsRow>("@/Master/WeightUnits/WeightUnitsPage");
    }
}