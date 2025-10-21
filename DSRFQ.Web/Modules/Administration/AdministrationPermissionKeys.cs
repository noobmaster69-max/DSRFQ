namespace DSRFQ.Administration;

[NestedPermissionKeys]
[DisplayName("Administration")]
public class PermissionKeys
{
    [Description("User, Role Management and Permissions")]
    public const string Security = "Administration:Security";

    [Description("Languages and Translations")]
    public const string Translation = "Administration:Translation";
    
    [Description("Company Management")]
    public const string Company = "Administration:Company";
    [Description("Group Management")]
    public const string Group = "Administration:Group";
}
