using Microsoft.AspNetCore.Mvc;
using Serenity.Web;

namespace DSRFQ.Master.Pages;

[PageAuthorize(typeof(SurfaceTreatmentProcessCostsRow))]
public class SurfaceTreatmentProcessCostsPage : Controller
{
    [Route("Master/SurfaceTreatmentProcessCosts")]
    public ActionResult Index()
    {
        return this.GridPage<SurfaceTreatmentProcessCostsRow>("@/Master/SurfaceTreatmentProcessCosts/SurfaceTreatmentProcessCostsPage");
    }
}