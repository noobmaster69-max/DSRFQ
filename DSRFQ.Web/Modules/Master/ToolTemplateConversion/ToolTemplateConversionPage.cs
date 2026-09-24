using Microsoft.AspNetCore.Mvc;
using Serenity.Web;

namespace DSRFQ.Master.Pages;

[PageAuthorize(typeof(ToolTemplateConversionRow))]
public class ToolTemplateConversionPage : Controller
{
    [Route("Master/ToolTemplateConversion")]
    public ActionResult Index()
    {
        return this.GridPage<ToolTemplateConversionRow>(
            "@/Master/ToolTemplateConversion/ToolTemplateConversionPage");
    }
}
