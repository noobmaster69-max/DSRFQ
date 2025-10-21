using Serenity.Navigation;
using MyPages = DSRFQ.Company.Pages;

[assembly: NavigationLink(int.MaxValue, "Administration/Company/Companies", typeof(MyPages.CompaniesPage), icon: "fa-building")]
[assembly: NavigationLink(int.MaxValue, "Administration/Company/Groups", typeof(MyPages.GroupsPage), icon: "fa-users")]


[assembly: NavigationLink(Int32.MaxValue, "Navigation/Organization/General", url: "~/OrganizationDetail", permission:"", icon: "fa-list-ol")]
[assembly: NavigationLink(Int32.MaxValue, "Navigation/Organization/Billing", url: "~/Billing", permission:"", icon: "fa-credit-card")]
