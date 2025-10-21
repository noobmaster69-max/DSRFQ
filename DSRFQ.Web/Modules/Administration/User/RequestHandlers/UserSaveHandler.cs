using MyRequest = Serenity.Services.SaveRequest<DSRFQ.Administration.UserRow>;
using MyResponse = Serenity.Services.SaveResponse;
using MyRow = DSRFQ.Administration.UserRow;

namespace DSRFQ.Administration;
public interface IUserSaveHandler : ISaveHandler<MyRow, MyRequest, MyResponse> { }
public class UserSaveHandler(IRequestContext context, IPasswordStrengthValidator passwordStrengthValidator) :
    SaveRequestHandler<MyRow, MyRequest, MyResponse>(context), IUserSaveHandler
{
    private readonly IPasswordStrengthValidator passwordStrengthValidator = passwordStrengthValidator
        ?? throw new ArgumentNullException(nameof(passwordStrengthValidator));

    private string password;

    protected override void GetEditableFields(HashSet<Field> editable)
    {
        base.GetEditableFields(editable);

        if (!Permissions.HasPermission(PermissionKeys.Security))
        {
            var fld = MyRow.Fields;
            editable.Remove(fld.Source);
            editable.Remove(fld.IsActive);
        }
    }

    public static string ValidateUsername(IDbConnection connection, string username, int? existingUserId,
        ITextLocalizer localizer)
    {
        var fld = MyRow.Fields;

        username = username.TrimToNull();
        if (username == null)
            throw DataValidation.RequiredError(fld.Username, localizer);

        if (!UserHelper.IsValidUsername(username))
            throw new ValidationError("InvalidUsername", "Username",
                "Usernames should start with letters, only contain letters and numbers!");

        var existing = UserHelper.GetUser(connection,
            new Criteria(fld.Username) == username |
            new Criteria(fld.Username) == username.Replace('I', 'İ'));

        if (existing != null && existingUserId != existing.UserId)
            throw new ValidationError("UniqueViolation", "Username",
                "A user with same name exists. Please choose another!");

        return username;
    }

    protected override void ValidateRequest()
    {
        base.ValidateRequest();

        if (IsUpdate)
        {
            if (Row.Username != Old.Username)
                Row.Username = ValidateUsername(Connection, Row.Username, Old.UserId.Value, Localizer);

            if (Row.DisplayName != Old.DisplayName)
                Row.DisplayName = UserHelper.ValidateDisplayName(Row.DisplayName, Localizer);
        }

        if (IsCreate)
        {
            Row.Username = ValidateUsername(Connection, Row.Username, null, Localizer);
            Row.DisplayName = UserHelper.ValidateDisplayName(Row.DisplayName, Localizer);
        }

        var fld = MyRow.Fields;
        if (IsCreate || (Row.IsAssigned(fld.Password) && !string.IsNullOrEmpty(Row.Password)))
        {
            if (Row.IsAssigned(fld.PasswordConfirm) && !string.IsNullOrEmpty(Row.PasswordConfirm) &&
                Row.Password != Row.PasswordConfirm)
                throw new ValidationError("PasswordConfirmMismatch", "PasswordConfirm", ChangePasswordValidationTexts.PasswordConfirmMismatch.ToString(Localizer));

            passwordStrengthValidator.Validate(Row.Password);
            password = Row.Password = Row.Password ?? "";
        }
    }

    protected override void SetInternalFields()
    {
        base.SetInternalFields();

        if (IsCreate)
        {
            Row.Source = "site";
            Row.IsActive = Row.IsActive ?? 1;
        }

        if (IsCreate || (Row.IsAssigned(MyRow.Fields.Password) && !string.IsNullOrEmpty(Row.Password)))
        {
            string salt = null;
            Row.PasswordHash = UserHelper.GenerateHash(password, ref salt);
            Row.PasswordSalt = salt;
        }
    }

    protected override void AfterSave()
    {
        base.AfterSave();

        Cache.InvalidateOnCommit(UnitOfWork, MyRow.Fields);
    }
}