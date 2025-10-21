using Microsoft.AspNetCore.Mvc;
using Serenity.Web;

namespace DSRFQ.Machines.Pages;

[PageAuthorize(typeof(MachinesRow))]
public class MachinesPage : Controller
{
    [Route("Machines/Machines")]
    public ActionResult Index()
    {
        return this.GridPage<MachinesRow>("@/Machines/Machines/MachinesPage");
    }
}