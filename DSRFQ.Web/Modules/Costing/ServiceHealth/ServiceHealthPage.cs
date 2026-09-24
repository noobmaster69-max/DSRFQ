using Microsoft.AspNetCore.Mvc;
using Serenity.Web;

namespace DSRFQ.Costing.Pages;

/// <summary>
/// Live status of the services behind Drawing, Costing and Ballooning.
/// </summary>
[PageAuthorize]
public class ServiceHealthPage : Controller
{
    [Route("Costing/ServiceStatus")]
    public ActionResult Index()
    {
        return this.PanelPage("@/Costing/ServiceHealth/ServiceHealthPage", "Service Status");
    }
}
