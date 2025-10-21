using Microsoft.AspNetCore.Mvc;
using Serenity.Web;

namespace DSRFQ.Company.Pages;

[PageAuthorize(typeof(GroupsRow))]
public class GroupsPage : Controller
{
    [Route("Company/Groups")]
    public ActionResult Index()
    {
        return this.GridPage<GroupsRow>("@/Company/Groups/GroupsPage");
    }
}