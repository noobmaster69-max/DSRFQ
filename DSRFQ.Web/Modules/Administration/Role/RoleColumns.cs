namespace DSRFQ.Administration.Forms;

[ColumnsScript("Administration.Role")]
[BasedOnRow(typeof(RoleRow), CheckNames = true)]
public class RoleColumns
{
    [EditLink, DisplayName("Db.Shared.RecordId"), AlignRight]
    public int RoleId { get; set; }
    [EditLink, Width(300), SortOrder(1)]
    public string RoleName { get; set; }
    [EditLink, Width(200)]
    public string RoleKey { get; set; }
}