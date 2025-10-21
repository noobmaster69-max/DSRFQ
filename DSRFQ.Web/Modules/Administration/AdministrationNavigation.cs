using Serenity.Navigation;
using MyPages = DSRFQ.Administration.Pages;
using Administration = DSRFQ.Administration.Pages;

[assembly: NavigationMenu(9000, "Administration", icon: "fa-tools")]
[assembly: NavigationLink(9100, "Administration/Data Audit Log", typeof(Serenity.Pro.DataAuditLog.DataAuditLogPage), icon: "fa-history premium-feature")]
[assembly: NavigationLink(9200, "Administration/Data Explorer", typeof(Serenity.Pro.DataExplorer.DataExplorerPage), icon: "fa-database premium-feature")]
[assembly: NavigationLink(9300, "Administration/Email Queue", typeof(Serenity.Pro.EmailQueue.EmailQueuePage), icon: "fa-envelope-o premium-feature")]
[assembly: NavigationLink(9400, "Administration/Exception Log", typeof(Administration.UserPage), action: "ExceptionLog", icon: "fa-ban", Target = "_blank")]
[assembly: NavigationLink(9500, "Administration/Languages", typeof(Administration.LanguagePage), icon: "fa-comments")]
[assembly: NavigationLink(9600, "Administration/Translations", typeof(Administration.TranslationPage), icon: "fa-comment-o")]
[assembly: NavigationLink(9700, "Administration/Roles", typeof(Administration.RolePage), icon: "fa-lock")]
[assembly: NavigationLink(9800, "Administration/User Management", typeof(Administration.UserPage), icon: "fa-users")]
[assembly: NavigationLink(9900, "Administration/User Invitations", typeof(Administration.UserInvitationsPage), icon: "fa-envelope")]