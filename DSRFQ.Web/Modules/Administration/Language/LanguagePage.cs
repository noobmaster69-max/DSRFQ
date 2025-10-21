namespace DSRFQ.Administration.Pages;

[PageAuthorize(typeof(LanguageRow))]
public class LanguagePage : Controller
{
    [Route("Administration/Language")]
    public ActionResult Index()
    {
        return this.GridPage<LanguageRow>(ESM.LanguagePage);
    }
}