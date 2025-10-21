using Microsoft.AspNetCore.Mvc;
using Serenity.Web;

namespace DSRFQ.Company.Pages;

[PageAuthorize(typeof(CompanyGroupsRow))]
public class CompanyGroupsPage : Controller
{
    [Route("Company/CompanyGroups")]
    public ActionResult Index()
    {
        return this.GridPage<CompanyGroupsRow>("@/Company/CompanyGroups/CompanyGroupsPage");
    }
}