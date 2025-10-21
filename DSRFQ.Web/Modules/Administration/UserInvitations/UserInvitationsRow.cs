using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;

namespace DSRFQ.Administration;

[ConnectionKey("Default"), Module("Administration"), TableName("UserInvitations")]
[DisplayName("User Invitations"), InstanceName("User Invitations")]
[ReadPermission(PermissionKeys.Security)]
[ModifyPermission("?")]
[LookupScript("UserInvitations",Permission = "?")]
[ServiceLookupPermission("?")]
public sealed class UserInvitationsRow : LoggingRow<UserInvitationsRow.RowFields>, IIdRow, INameRow
{
    const string jUser = nameof(jUser);
    [DisplayName("Id"), Column("ID"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Invited By User"), Column("InvitedByUserID"), NotNull, ForeignKey("Users", "UserId"),LeftJoin(jUser)]
    public int? InvitedByUserId { get => fields.InvitedByUserId[this]; set => fields.InvitedByUserId[this] = value; }

    [DisplayName("Email Address"), QuickSearch, NameProperty]
    public string EmailAddress { get => fields.EmailAddress[this]; set => fields.EmailAddress[this] = value; }
    
    [DisplayName("Invited By User"),Expression($"{jUser}.[DisplayName]")]
    public string InvitedByUserName
    {
        get => fields.InvitedByUserName[this];
        set => fields.InvitedByUserName[this] = value;
    }
    [DisplayName("Accepted"), Column("Accepted"),BooleanEditor]
    public bool? Accepted
    {
        get => fields.Accepted[this];
        set => fields.Accepted[this] = value;
    }
    public class RowFields : LoggingRowFields
    {
        public Int32Field Id;
        public Int32Field InvitedByUserId;
        public StringField EmailAddress;
        public StringField InvitedByUserName;
        public BooleanField Accepted;


    }
}