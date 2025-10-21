using Serenity.ComponentModel;
using System;

namespace DSRFQ.Administration.Forms;

[FormScript("Administration.UserInvitations")]
[BasedOnRow(typeof(UserInvitationsRow), CheckNames = true)]
public class UserInvitationsForm
{
    public int InvitedByUserId { get; set; }
    public string EmailAddress { get; set; }
    public bool Accepted { get; set; }
}