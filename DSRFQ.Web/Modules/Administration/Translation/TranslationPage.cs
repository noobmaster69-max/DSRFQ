namespace DSRFQ.Administration.Pages;

[PageAuthorize(PermissionKeys.Translation)]
public class TranslationPage : Controller
{
    [Route("Administration/Translation")]
    public ActionResult Index([FromServices] IOptions<BaseTranslationOptions> translationOptions)
    {
        return this.GridPage(ESM.TranslationPage,
            TranslationTexts.EntityPlural, new
            {
                translateTextEnabled = translationOptions?.Value?.Enabled ?? false,
                batchSize = translationOptions?.Value?.BatchSize,
                parallelRequests = translationOptions?.Value?.ParallelRequests
            });
    }
}