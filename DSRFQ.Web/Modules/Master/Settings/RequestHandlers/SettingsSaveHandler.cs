using System.Linq;
using Serenity.Services;
using MyRequest = Serenity.Services.SaveRequest<DSRFQ.Master.SettingsRow>;
using MyResponse = Serenity.Services.SaveResponse;
using MyRow = DSRFQ.Master.SettingsRow;

namespace DSRFQ.Master;

public interface ISettingsSaveHandler : ISaveHandler<MyRow, MyRequest, MyResponse> { }

public class SettingsSaveHandler : SaveRequestHandler<MyRow, MyRequest, MyResponse>,
    ISettingsSaveHandler
{
    public SettingsSaveHandler(IRequestContext context)
        : base(context)
    {
    }

    protected override void ValidateRequest()
    {
        base.ValidateRequest();

        // Free text, because which mark a shop writes between a parent and its
        // child is its own business and parseBalloonNumber reads whatever it
        // finds. Three things still break rather than merely look odd, because
        // the composite is stored in BalloonNo as text and parsed back out:
        // a digit merges with the numbers either side, whitespace is already
        // skipped when parsing, and "_" is how a repeated instance is written.
        //
        // Enforced here as well as in the widget because the widget is not the
        // only writer - the settings page edits the same row.
        var sep = Row.SubNumberSeparator;
        if (sep != null && (sep.Length == 0 || sep.Length > 3
                            || sep.Any(c => char.IsDigit(c)
                                            || char.IsWhiteSpace(c)
                                            || c == '_')))
            throw new ValidationError("InvalidSeparator", "SubNumberSeparator",
                "The separator can be up to 3 characters, but not a digit, a " +
                "space, or \"_\". A digit would merge with the balloon numbers " +
                "either side, and \"_\" already means a repeated instance, so " +
                "\"5_1\" would be ambiguous.");

        // Confidence is a fraction. A value above 1 would silently stop every
        // datum from ever being added, which looks like the detector breaking.
        var conf = Row.DatumAddMinConfidence;
        if (conf != null && (conf < 0m || conf > 1m))
            throw new ValidationError("InvalidConfidence", "DatumAddMinConfidence",
                "Minimum confidence is a fraction between 0 and 1.");
    }
}
