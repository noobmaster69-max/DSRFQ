namespace DSRFQ;

[NestedLocalTexts(Prefix = "Forms.")]
public static partial class SiteFormTexts
{
    public static string siteTitle = AppConfigHelper.GetConfigValue("Company:ShortName");
    public static readonly LocalText SiteTitle = siteTitle;
}