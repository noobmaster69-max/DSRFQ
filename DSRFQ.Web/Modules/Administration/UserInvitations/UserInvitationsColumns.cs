using Serenity.ComponentModel;
using System;
using System.ComponentModel;

namespace DSRFQ.Administration.Columns;

[ColumnsScript("Administration.UserInvitations")]
[BasedOnRow(typeof(UserInvitationsRow), CheckNames = true)]
public class UserInvitationsColumns
{
    [EditLink, DisplayName("Db.Shared.RecordId"), AlignRight]
    public int Id { get; set; }
    public string InvitedByUserName { get; set; }
    [EditLink]
    public string EmailAddress { get; set; }
    public bool Accepted { get; set; }
    public DateTime InsertDate { get; set; }
    public string InsertBy { get; set; }
    public DateTime UpdateDate { get; set; }
    public string UpdateBy { get; set; }
    public DateTime DeleteDate { get; set; }
    public string DeleteBy { get; set; }
}