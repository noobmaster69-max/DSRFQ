namespace DSRFQ.Administration.Pages;

[PageAuthorize(typeof(UserRow))]
public class UserPage : Controller
{
    [Route("Administration/User")]
    public ActionResult Index()
    {
        return this.GridPage<UserRow>(ESM.UserPage);
    }

#pragma warning disable ASP0018 // Unused route parameter
    [Route("Administration/ExceptionLog/{*pathInfo}"), IgnoreAntiforgeryToken]
#pragma warning restore ASP0018 // Unused route parameter
    public async Task ExceptionLog()
    {
        await StackExchange.Exceptional.ExceptionalMiddleware
            .HandleRequestAsync(HttpContext).ConfigureAwait(false);
    }
}