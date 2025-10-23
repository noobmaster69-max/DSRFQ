using DSRFQ.Administration;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Serenity.Web.Providers;

namespace DSRFQ.Membership.Pages;
public partial class AccountPage : Controller
{
    [HttpGet]
    public ActionResult SignUp([FromQuery] string providerToken,[FromQuery] string email,[FromQuery] int invitationId)
    {
        var model = new SignupPageModel();
        model.Email = email;
        model.InvitationId = invitationId;
        ;
        return View(MVC.Views.Membership.Account.SignUp.SignUpPage, model);
    }
    private string SendActivationEmail(ISiteAbsoluteUrl siteAbsoluteUrl, IEmailSender emailSender, int userId,
        string username, string displayName, string email)
    {
        var token = HttpContext.RequestServices.GetDataProtector(ActivatePurpose)
            .ProtectBinary(bw =>
            {
                bw.Write(DateTime.UtcNow.AddHours(3).ToBinary());
                bw.Write(userId);
            });

        var externalUrl = siteAbsoluteUrl.GetExternalUrl();
        var activateLink = UriHelper.Combine(externalUrl, "Account/Activate?t=");
        activateLink += Uri.EscapeDataString(token);

        var emailModel = new ActivateEmailModel
        {
            Username = username,
            DisplayName = displayName,
            ActivateLink = activateLink
        };

        var emailSubject = SignUpFormTexts.ActivateEmailSubject.ToString(Localizer);
        var emailBody = TemplateHelper.RenderViewToString(HttpContext.RequestServices,
            MVC.Views.Membership.Account.SignUp.ActivateEmail, emailModel);

        ArgumentNullException.ThrowIfNull(emailSender);

        emailSender.Send(subject: emailSubject, body: emailBody, mailTo: email);
        return token;
    }

    [HttpPost, JsonRequest]
    public Result<SignUpResponse> SignUp(SignUpRequest request,
        [FromServices] IEmailSender emailSender,
        [FromServices] IPasswordStrengthValidator passwordRuleValidator,
        [FromServices] IPermissionKeyLister permissionKeyLister,
        [FromServices] ISiteAbsoluteUrl siteAbsoluteUrl,
        [FromServices] ITypeSource typeSource,
        [FromServices] IUserProvider userProvider,
        [FromServices] IOptions<RecaptchaSettings> recaptchaOptions,
        [FromServices] IOptions<EnvironmentSettings> environmentOptions
    )
    {
        return this.UseConnection("Default", connection =>
        {
            ArgumentNullException.ThrowIfNull(request);

            if (!string.IsNullOrEmpty(recaptchaOptions?.Value?.SiteKey) ||
                !string.IsNullOrEmpty(recaptchaOptions?.Value?.SecretKey))
            {
                RecaptchaValidation.Validate(recaptchaOptions.Value.SecretKey, request.Recaptcha, Localizer);
            }

            ArgumentException.ThrowIfNullOrWhiteSpace(request.Email);
            ArgumentException.ThrowIfNullOrEmpty(request.Password);
            passwordRuleValidator.Validate(request.Password);
            ArgumentException.ThrowIfNullOrWhiteSpace(request.DisplayName);

            if (connection.Exists<UserRow>(
                    UserRow.Fields.Username == request.Email |
                    UserRow.Fields.Email == request.Email))
            {
                throw new ValidationError("EmailInUse", MembershipValidationTexts.EmailInUse.ToString(Localizer));
            }

            using var uow = new UnitOfWork(connection);
            string salt = null;
            var hash = UserHelper.GenerateHash(request.Password ?? "", ref salt);
            var displayName = request.DisplayName.TrimToEmpty();
            var email = request.Email;
            var username = request.Email;


            
            var userId = (int)connection.InsertAndGetID(new UserRow
            {
                Username = username,
                Source = "sign",
                DisplayName = displayName,
                Email = email,
                PasswordHash = hash,
                PasswordSalt = salt,
                IsActive = 0,
                InsertDate = DateTime.Now,
                InsertUserId = 1,
                LastDirectoryUpdate = DateTime.Now,
                UserInvitationId = request.UserInvitationId == 0?null:request.UserInvitationId
            });

            SendActivationEmail(
                siteAbsoluteUrl, emailSender, userId, username, displayName, email);

            uow.Commit();

            userProvider.RemoveCachedUser(userId.ToInvariant(), username);

            return new SignUpResponse();
        });
    }

    private const string ActivatePurpose = "Activate";

    [HttpGet]
    public ActionResult Activate(string t, [FromServices] ISqlConnections sqlConnections)
    {
        ArgumentNullException.ThrowIfNull(sqlConnections);

        using var connection = sqlConnections.NewByKey("Default");
        using var uow = new UnitOfWork(connection);
        int userId;
        try
        {
            using var br = HttpContext.RequestServices.GetDataProtector(ActivatePurpose)
                .UnprotectBinary(t);

            var dt = DateTime.FromBinary(br.ReadInt64());
            if (dt < DateTime.UtcNow)
                return Error(MembershipValidationTexts.InvalidActivateToken.ToString(Localizer));

            userId = br.ReadInt32();
        }
        catch (Exception)
        {
            return Error(MembershipValidationTexts.InvalidActivateToken.ToString(Localizer));
        }

        var user = uow.Connection.TryById<UserRow>(userId);
        if (user == null || user.IsActive != 0)
            return Error(MembershipValidationTexts.InvalidActivateToken.ToString(Localizer));

        uow.Connection.UpdateById(new UserRow
        {
            UserId = user.UserId.Value,
            IsActive = 1
        });

        Cache.InvalidateOnCommit(uow, UserRow.Fields);
        uow.Commit();

        return new RedirectResult("~/Account/Login?activated=" + Uri.EscapeDataString(user.Email));
    }
}