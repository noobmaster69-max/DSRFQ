using MyPages = DSRFQ.Costing.Pages;
using Serenity.Navigation;

[assembly: NavigationLink(Int32.MaxValue, "Navigation/Costing/Drawing Library", typeof(MyPages.CostingPartsPage), icon: "fa-clipboard")]
[assembly: NavigationLink(Int32.MaxValue, "Navigation/Costing/File Library", typeof(MyPages.CostingPartFilesPage), icon: "fa-search")]
[assembly: NavigationLink(Int32.MaxValue, "Navigation/Costing/Processing Queue", typeof(MyPages.CostingPartQueuePage), icon: "fa-tasks")]
[assembly: NavigationLink(Int32.MaxValue, "Navigation/Costing/Service Status", typeof(MyPages.ServiceHealthPage), icon: "fa-heartbeat")]
