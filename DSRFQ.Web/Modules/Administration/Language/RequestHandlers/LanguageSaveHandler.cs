using MyRequest = Serenity.Services.SaveRequest<DSRFQ.Administration.LanguageRow>;
using MyResponse = Serenity.Services.SaveResponse;
using MyRow = DSRFQ.Administration.LanguageRow;

namespace DSRFQ.Administration;
public interface ILanguageSaveHandler : ISaveHandler<MyRow, MyRequest, MyResponse> { }
public class LanguageSaveHandler(IRequestContext context) :
    SaveRequestHandler<MyRow, MyRequest, MyResponse>(context), ILanguageSaveHandler
{
}