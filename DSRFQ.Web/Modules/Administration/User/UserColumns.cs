namespace DSRFQ.Administration.Columns;

[ColumnsScript("Administration.User")]
[BasedOnRow(typeof(UserRow), CheckNames = true)]
public class UserColumns
{
    [EditLink, AlignRight, Width(55)]
    public string UserId { get; set; }
    [EditLink, Width(150), SortOrder(1)]
    public string Username { get; set; }
    [Width(32)]
    public string ImpersonationToken { get; set; }
    [Width(150)]
    public string DisplayName { get; set; }
    [Width(150)]
    public string GroupName { get; set; }
    [Width(150)]
    public string CompanyName { get; set; }
    [Width(250)]
    public string Email { get; set; }
    [Width(80)]
    public string Source { get; set; }
    [QuickFilter, Width(300)]
    public string Roles { get; set; }
}
