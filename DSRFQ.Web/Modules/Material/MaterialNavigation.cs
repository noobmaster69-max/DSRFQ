using Serenity.Navigation;
using MyPages = DSRFQ.Material.Pages;

[assembly: NavigationLink(int.MaxValue, "Master/Material/Materials", typeof(MyPages.MaterialsPage), icon: "fa-drum-steelpan")]
[assembly: NavigationLink(int.MaxValue, "Master/Material/Raw Material Costs", typeof(MyPages.RawMaterialCostsPage), icon: "fa-coins")]