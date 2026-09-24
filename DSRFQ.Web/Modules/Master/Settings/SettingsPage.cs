using Microsoft.AspNetCore.Mvc;
using Serenity.Web;

namespace DSRFQ.Master.Pages;

[PageAuthorize(typeof(SettingsRow))]
public class SettingsPage : Controller
{
    [Route("Master/Settings")]
    public ActionResult Index()
    {
        return this.GridPage<SettingsRow>("@/Master/Settings/SettingsPage");
    }
}
