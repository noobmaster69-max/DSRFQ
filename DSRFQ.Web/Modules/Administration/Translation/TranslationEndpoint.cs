namespace DSRFQ.Administration.Endpoints;

[Route("Services/Administration/Translation/[action]")]
[ServiceAuthorize(PermissionKeys.Translation)]
public class TranslationEndpoint : ServiceEndpoint
{
    [HttpPost]
    public TranslationListResponse List(TranslationListRequest request,
        [FromServices] ITranslationListHandler handler)
    {
        return handler.List(request);
    }

    [HttpPost]
    public ServiceResponse Update(TranslationUpdateRequest request,
        [FromServices] ITranslationUpdateHandler handler)
    {
        return handler.Update(request);
    }

    public TranslateTextResponse TranslateText(TranslateTextRequest request,
        [FromServices] ITranslateTextHandler handler)
    {
        return handler.Translate(request);
    }
}