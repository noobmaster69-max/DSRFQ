using Serenity.Navigation;
using MyPages = DSRFQ.Master.Pages;

[assembly: NavigationLink(int.MaxValue, "Master/General/Costing Status", typeof(MyPages.CostingStatusPage), icon: "fa-square")]
[assembly: NavigationLink(int.MaxValue, "Master/General/Currencies", typeof(MyPages.CurrenciesPage), icon: "fa-dollar-sign")]
[assembly: NavigationLink(int.MaxValue, "Master/General/Dimension Units", typeof(MyPages.DimensionUnitsPage), icon: "fa-ruler")]
[assembly: NavigationLink(int.MaxValue, "Master/General/Volume Units", typeof(MyPages.VolumeUnitsPage), icon: "fa-box")]
[assembly: NavigationLink(int.MaxValue, "Master/General/Weight Units", typeof(MyPages.WeightUnitsPage), icon: "fa-weight")]
[assembly: NavigationLink(int.MaxValue, "Master/Process/Special Process", typeof(MyPages.SurfaceTreatmentProcessesPage), icon: "fa-fire")]
