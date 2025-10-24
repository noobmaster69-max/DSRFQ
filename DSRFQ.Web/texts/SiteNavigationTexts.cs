namespace DSRFQ;

[NestedLocalTexts(Prefix = "Navigation.")]
public static partial class SiteNavigationTexts
{
    public static string siteTitle = AppConfigHelper.GetConfigValue("Company:ShortName");
    public static readonly LocalText Dashboard = "Dashboard";
    public static readonly LocalText LogoutLink = "Logout";
    public static readonly LocalText SiteTitle = siteTitle;
}
