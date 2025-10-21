using Microsoft.AspNetCore.Mvc;
using Serenity.Web;

namespace DSRFQ.Master.Pages;

[PageAuthorize(typeof(SurfaceTreatmentProcessesRow))]
public class SurfaceTreatmentProcessesPage : Controller
{
    [Route("Master/SurfaceTreatmentProcesses")]
    public ActionResult Index()
    {
        return this.GridPage<SurfaceTreatmentProcessesRow>("@/Master/SurfaceTreatmentProcesses/SurfaceTreatmentProcessesPage");
    }
}