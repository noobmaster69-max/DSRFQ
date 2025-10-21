using DSRFQ.Company;
using Serenity.Extensions.Entities;

namespace DSRFQ.Administration;
[ConnectionKey("Default"), Module("Administration"), TableName("Users")]
[DisplayName("Users"), InstanceName("User"), GenerateFields]
[ReadPermission(PermissionKeys.Security)]
[ModifyPermission(PermissionKeys.Security)]
[LookupScript(Permission = PermissionKeys.Security)]
public sealed partial class UserRow : Serenity.Extensions.Entities.LoggingRow<UserRow.RowFields>, IIdRow, INameRow, IIsActiveRow, IDisplayNameRow, IEmailRow, IPasswordRow, ITwoFactorRow
{
    const string jCompany = nameof(jCompany);
    const string jGroup = nameof(jGroup);
    const string jUserInvitation = nameof(jUserInvitation);
    [DisplayName("User Id"), Identity, IdProperty]
    public int? UserId { get => fields.UserId[this]; set => fields.UserId[this] = value; }

    [DisplayName("Username"), Size(100), NotNull, QuickSearch, LookupInclude, NameProperty]
    public string Username { get => fields.Username[this]; set => fields.Username[this] = value; }

    [DisplayName("Source"), Size(4), NotNull, Insertable(false), Updatable(false), DefaultValue("site")]
    public string Source { get => fields.Source[this]; set => fields.Source[this] = value; }

    [DisplayName("Password Hash"), Size(86), NotNull, Insertable(false), Updatable(false), MinSelectLevel(SelectLevel.Never), ScriptSkip]
    public string PasswordHash { get => fields.PasswordHash[this]; set => fields.PasswordHash[this] = value; }

    [DisplayName("Password Salt"), Size(10), NotNull, Insertable(false), Updatable(false), MinSelectLevel(SelectLevel.Never), ScriptSkip]
    public string PasswordSalt { get => fields.PasswordSalt[this]; set => fields.PasswordSalt[this] = value; }

    [DisplayName("Display Name"), Size(100), NotNull, LookupInclude]
    public string DisplayName { get => fields.DisplayName[this]; set => fields.DisplayName[this] = value; }

    [DisplayName("Email"), Size(100)]
    public string Email { get => fields.Email[this]; set => fields.Email[this] = value; }

    [DisplayName("Mobile Phone Number"), Size(20)]
    public string MobilePhoneNumber { get => fields.MobilePhoneNumber[this]; set => fields.MobilePhoneNumber[this] = value; }

    [DisplayName("2FA Data"), EmitFieldType(typeof(JsonField<>)), MinSelectLevel(SelectLevel.Never), Insertable(false), Updatable(false), ScriptSkip]
    public TwoFactorUserData TwoFactorData { get => fields.TwoFactorData[this]; set => fields.TwoFactorData[this] = value; }

    [DisplayName("User Image"), Size(100)]
    [ImageUploadEditor(FilenameFormat = "UserImage/~", CopyToHistory = true)]
    public string UserImage { get => fields.UserImage[this]; set => fields.UserImage[this] = value; }

    [DisplayName("Password"), Size(50), NotMapped]
    public string Password { get => fields.Password[this]; set => fields.Password[this] = value; }

    [DisplayName("Activated"), NotNull, Insertable(false), Updatable(true)]
    public short? IsActive { get => fields.IsActive[this]; set => fields.IsActive[this] = value; }

    [DisplayName("Confirm Password"), Size(50), NotMapped]
    public string PasswordConfirm { get => fields.PasswordConfirm[this]; set => fields.PasswordConfirm[this] = value; }

    [DisplayName("Last Directory Update"), Insertable(false), Updatable(false)]
    public DateTime? LastDirectoryUpdate { get => fields.LastDirectoryUpdate[this]; set => fields.LastDirectoryUpdate[this] = value; }

    [NotMapped, MinSelectLevel(SelectLevel.Explicit), ReadPermission("ImpersonateAs")]
    public string ImpersonationToken { get => fields.ImpersonationToken[this]; set => fields.ImpersonationToken[this] = value; }

    [DisplayName("Roles"), LinkingSetRelation(typeof(UserRoleRow), nameof(UserRoleRow.UserId), nameof(UserRoleRow.RoleId))]
    [AsyncLookupEditor(typeof(RoleRow), Multiple = true)]
    public List<int> Roles { get => fields.Roles[this]; set => fields.Roles[this] = value; }

    StringField IDisplayNameRow.DisplayNameField => fields.DisplayName;
    StringField IEmailRow.EmailField => fields.Email;
    Int16Field IIsActiveRow.IsActiveField => fields.IsActive;
    StringField IPasswordRow.PasswordHashField => fields.PasswordHash;
    StringField IPasswordRow.PasswordSaltField => fields.PasswordSalt;
    GenericClassField<TwoFactorUserData> ITwoFactorRow.TwoFactorDataField => fields.TwoFactorData;
    [LookupEditor(typeof(CompaniesRow),FilterField = "IsActive",FilterValue = "1")]
    [ReadPermission(PermissionKeys.Company)]
    [DisplayName("Company"), Column("CompanyID"), LookupInclude, ForeignKey("Companies", "ID"), LeftJoin(jCompany), TextualField(nameof(CompanyName))]
    public int? CompanyId
    {
        get => fields.CompanyId[this];
        set => fields.CompanyId[this] = value;
    }
    [DisplayName("Company"),Expression($"{jCompany}.[Name]"),LookupInclude]
    public string CompanyName
    {
        get => fields.CompanyName[this];
        set => fields.CompanyName[this] = value;
    }
    [LookupEditor(typeof(GroupsRow),FilterField = "IsActive",FilterValue = "1")]
    [ReadPermission(PermissionKeys.Group)]
    [DisplayName("Group"), Column("GroupID"),LookupInclude,ForeignKey("Groups","ID"), LeftJoin(jGroup), TextualField(nameof(GroupName))]
    public int? GroupId
    {
        get => fields.GroupId[this];
        set => fields.GroupId[this] = value;
    }
    [DisplayName("Group"),Expression($"{jGroup}.[Name]"),LookupInclude]
    public string GroupName
    {
        get => fields.GroupName[this];
        set => fields.GroupName[this] = value;
    }
    [DisplayName("Companies")]
    [LookupEditor(typeof(CompaniesRow), Multiple = true,FilterField = "IsActive",FilterValue = "1",Delimited = true), NotMapped]
        
    public string CompanyGroupList
    {
        get => fields.CompanyGroupList[this];
        set => fields.CompanyGroupList[this] = value;
    }
    [DisplayName("User Invitation"),Column("UserInvitationID"),ForeignKey("UserInvitations","ID"),LeftJoin(jUserInvitation)]
    public int? UserInvitationId { get => fields.UserInvitationId[this]; set => fields.UserInvitationId[this] = value; }
    [DisplayName("Invited By User Id"),Expression($"{jUserInvitation}.[InvitedByUserId]")]
    public int? InvitedByUserId { get => fields.InvitedByUserId[this]; set => fields.InvitedByUserId[this] = value; }
    public Int32Field CompanyIdField { get => Fields.CompanyId; }
    public Int32Field GroupIdField { get => Fields.GroupId; }  
    public partial class RowFields : Serenity.Extensions.Entities.LoggingRowFields
    {
    }
}