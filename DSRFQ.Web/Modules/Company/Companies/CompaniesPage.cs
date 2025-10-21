using Microsoft.AspNetCore.Mvc;
using Serenity.Web;

namespace DSRFQ.Company.Pages;

[PageAuthorize(typeof(CompaniesRow))]
public class CompaniesPage : Controller
{
    [Route("Company/Companies")]
    public ActionResult Index()
    {
        return this.GridPage<CompaniesRow>("@/Company/Companies/CompaniesPage");
    }
}