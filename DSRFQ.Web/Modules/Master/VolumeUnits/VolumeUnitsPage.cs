using Microsoft.AspNetCore.Mvc;
using Serenity.Web;

namespace DSRFQ.Master.Pages;

[PageAuthorize(typeof(VolumeUnitsRow))]
public class VolumeUnitsPage : Controller
{
    [Route("Master/VolumeUnits")]
    public ActionResult Index()
    {
        return this.GridPage<VolumeUnitsRow>("@/Master/VolumeUnits/VolumeUnitsPage");
    }
}