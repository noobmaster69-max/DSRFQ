namespace DSRFQ.Modules.Common.Permissions;

[NestedPermissionKeys]
[DisplayName("Company")]
public class CompanyPermissionKeys
{
    [Description("Insert")]
    public const string Insert = "Company:Insert";
    [Description("Update")]
    public const string Update = "Company:Update";
    [Description("Delete")]
    public const string Delete = "Company:Delete";
    [Description("View")]
    public const string View = "Company:View";
    [Description("Navigation")]
    public const string Navigation = "Company:Navigation";
}
[NestedPermissionKeys]
[DisplayName("Wallet")]
public class WalletPermissionKeys
{
    [Description("Insert")]
    public const string Insert = "Wallet:Insert";
    [Description("Update")]
    public const string Update = "Wallet:Update";
    [Description("Delete")]
    public const string Delete = "Wallet:Delete";
    [Description("View")]
    public const string View = "Wallet:View";
    [Description("Navigation")]
    public const string Navigation = "Wallet:Navigation";
}
[NestedPermissionKeys]
[DisplayName("Master")]
public class MasterPermissionKeys
{
    //Status
    [Description("Insert")]
    public const string MasterStatusInsert = "Master:Status:Insert";
    [Description("Update")]
    public const string MasterStatusUpdate = "Master:Status:Update";
    [Description("Delete")]
    public const string MasterStatusDelete = "Master:Status:Delete";
    [Description("View")]
    public const string MasterStatusView = "Master:Status:View";
    [Description("Navigation")]
    public const string MasterStatusNavigation = "Master:Status:Navigation";
    
    //Currency
    [Description("Insert")]
    public const string MasterCurrencyInsert = "Master:Currency:Insert";
    [Description("Update")]
    public const string MasterCurrencyUpdate = "Master:Currency:Update";
    [Description("Delete")]
    public const string MasterCurrencyDelete = "Master:Currency:Delete";
    [Description("View")]
    public const string MasterCurrencyView = "Master:Currency:View";
    [Description("Navigation")]
    public const string MasterCurrencyNavigation = "Master:Currency:Navigation";
    
    //Material
    [Description("Insert")]
    public const string MasterMaterialInsert = "Master:Material:Insert";
    [Description("Update")]
    public const string MasterMaterialUpdate = "Master:Material:Update";
    [Description("Delete")]
    public const string MasterMaterialDelete = "Master:Material:Delete";
    [Description("View")]
    public const string MasterMaterialView = "Master:Material:View";
    [Description("Navigation")]
    public const string MasterMaterialNavigation = "Master:Material:Navigation";
    
    //Dimension Unit
    [Description("Insert")]
    public const string MasterDimensionUnitInsert = "Master:Dimension Unit:Insert";
    [Description("Update")]
    public const string MasterDimensionUnitUpdate = "Master:Dimension Unit:Update";
    [Description("Delete")]
    public const string MasterDimensionUnitDelete = "Master:Dimension Unit:Delete";
    [Description("View")]
    public const string MasterDimensionUnitView = "Master:Dimension Unit:View";
    [Description("Navigation")]
    public const string MasterDimensionUnitNavigation = "Master:Dimension Unit:Navigation";
    
    //machine
    [Description("Insert")]
    public const string MasterMachineInsert = "Master:Machine:Insert";
    [Description("Update")]
    public const string MasterMachineUpdate = "Master:Machine:Update";
    [Description("Delete")]
    public const string MasterMachineDelete = "Master:Machine:Delete";
    [Description("View")]
    public const string MasterMachineView = "Master:Machine:View";
    [Description("Navigation")]
    public const string MasterMachineNavigation = "Master:Machine:Navigation";
    
    //Special Process
    [Description("Insert")]
    public const string MasterSpInsert = "Master:Special Process:Insert";
    [Description("Update")]
    public const string MasterSpUpdate = "Master:Special Process:Update";
    [Description("Delete")]
    public const string MasterSpDelete = "Master:Special Process:Delete";
    [Description("View")]
    public const string MasterSpView = "Master:Special Process:View";
    [Description("Navigation")]
    public const string MasterSpNavigation = "Master:Special Process:Navigation";
}

[NestedPermissionKeys]
[DisplayName("Drawing")]
public class DrawingPermissionKeys
{
    [Description("Insert")]
    public const string Insert = "Drawing:Insert";
    [Description("Update")]
    public const string Update = "Drawing:Update";
    [Description("Delete")]
    public const string Delete = "Drawing:Delete";
    [Description("View")]
    public const string View = "Drawing:View";
    [Description("Navigation")]
    public const string Navigation = "Drawing:Navigation";
}