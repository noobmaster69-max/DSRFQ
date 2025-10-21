using Microsoft.AspNetCore.Mvc;
using Serenity.Web;

namespace DSRFQ.Administration.Pages;

[PageAuthorize(typeof(UserInvitationsRow))]
public class UserInvitationsPage : Controller
{
    [Route("Administration/UserInvitations")]
    public ActionResult Index()
    {
        return this.GridPage<UserInvitationsRow>("@/Administration/UserInvitations/UserInvitationsPage");
    }
}