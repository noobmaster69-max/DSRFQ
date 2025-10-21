[assembly: NavigationGroup("Navigation", "fa-home", Default = true)]

[assembly: NavigationSection("DSRFQ/Demo Modules",
    Include = ["Northwind", "Basic Samples", "Advanced Samples", "Application Samples", "UI Elements", "Theme Samples"])]

[assembly: NavigationSection("DSRFQ/Pro Features",
    Include = ["Meeting", "Work Log"])]
[assembly: NavigationGroup("Master", icon: "fa-th-list")]

[assembly: NavigationSection("Master/Material")]
[assembly: NavigationSection("Master/Machine")]

[assembly: NavigationSection("Master/General")]


[assembly: NavigationGroup(9000, "Administration", icon: "fa-tools")]

[assembly: NavigationSection("Administration/General", Default = true)]

[assembly: NavigationSection("Administration/Localization",
    Include = ["Administration/Languages", "Administration/Translations"])]

[assembly: NavigationSection("Administration/Security",
    Include = ["Administration/Roles", "Administration/User Management","Administration/User Invitations"])]
[assembly:NavigationSection("Administration/Company")]
[assembly: NavigationSection("Administration/Wallet")]
[assembly: NavigationLink(1000, "Dashboard", url: "~/", permission: "", icon: "fa-tachometer")]
    
[assembly: NavigationSection("Navigation/Costing")]

[assembly: NavigationSection("Navigation/Organization")]

