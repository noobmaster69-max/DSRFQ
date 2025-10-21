using DSRFQ.Administration;
using DSRFQ.Modules.Membership;
using DSRFQ.Modules.Membership.Account.Invitation;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Serenity.Web.Providers;

namespace DSRFQ.Membership.Pages;
public partial class AccountPage : Controller
{
    

    private string SendInvitationEmail(ISiteAbsoluteUrl siteAbsoluteUrl, IEmailSender emailSender, int invitationId,
        string displayName, string email)
    {
        var token = HttpContext.RequestServices.GetDataProtector(InvitationPurpose)
            .ProtectBinary(bw =>
            {
                bw.Write(DateTime.UtcNow.AddHours(3).ToBinary());
                bw.Write(invitationId);
            });

        var externalUrl = siteAbsoluteUrl.GetExternalUrl();
        var activateLink = UriHelper.Combine(externalUrl, "Account/AcceptInvitation?t=");
        activateLink += Uri.EscapeDataString(token);

        var emailModel = new InviteEmailModel
        {
            EmailAddress = email,
            DisplayName = displayName,
            ActivateLink = activateLink,
            BaseUrl = $"{Request.Scheme}://{Request.Host}"
        };

        var emailSubject = SignUpFormTexts.ActivateEmailSubject.ToString(Localizer);
        emailSubject = "Invitation to join DSRFQ";
        var emailBody = TemplateHelper.RenderViewToString(HttpContext.RequestServices,
            MVC.Views.Membership.Account.Invitation.InviteEmail, emailModel);

        ArgumentNullException.ThrowIfNull(emailSender);

        emailSender.Send(subject: emailSubject, body: emailBody, mailTo: email);
        return token;
    }

    [HttpPost, JsonRequest]
    public Result<SignUpResponse> Invite(InviteRequest request,
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
            // ArgumentNullException.ThrowIfNull(request);
            //
            // if (!string.IsNullOrEmpty(recaptchaOptions?.Value?.SiteKey) ||
            //     !string.IsNullOrEmpty(recaptchaOptions?.Value?.SecretKey))
            // {
            //     RecaptchaValidation.Validate(recaptchaOptions.Value.SecretKey, request.Recaptcha, Localizer);
            // }
            //
            // ArgumentException.ThrowIfNullOrWhiteSpace(request.Email);
            // ArgumentException.ThrowIfNullOrEmpty(request.Password);
            // passwordRuleValidator.Validate(request.Password);
            // ArgumentException.ThrowIfNullOrWhiteSpace(request.DisplayName);
            
            if (connection.Exists<UserInvitationsRow>(
                    UserInvitationsRow.Fields.InvitedByUserId == request.InvitedByUserId &
                    UserInvitationsRow.Fields.EmailAddress == request.Email))
            {
                throw new ValidationError("UserInvited", InvitationValidationTexts.UserInvited.ToString(Localizer));
            }

            using var uow = new UnitOfWork(connection);
            

            var invitationId = (int)connection.InsertAndGetID(new UserInvitationsRow
            {
                InvitedByUserId = request.InvitedByUserId,
                EmailAddress = request.Email,
                IsActive = 1,
                InsertDate = DateTime.Now,
                InsertUserId = request.InvitedByUserId});

            SendInvitationEmail(
                siteAbsoluteUrl, emailSender, invitationId, request.DisplayName, request.Email);

            uow.Commit();


            return new SignUpResponse();
        });
    }
    
    private const string InvitationPurpose = "Accept Invitation";

    [HttpGet]
    public ActionResult AcceptInvitation(string t, [FromServices] ISqlConnections sqlConnections)
    {
        ArgumentNullException.ThrowIfNull(sqlConnections);

        using var connection = sqlConnections.NewByKey("Default");
        using var uow = new UnitOfWork(connection);
        int userId;
        int invitationId;
        try
        {
            using var br = HttpContext.RequestServices.GetDataProtector(InvitationPurpose)
                .UnprotectBinary(t);

            var dt = DateTime.FromBinary(br.ReadInt64());
            if (dt < DateTime.UtcNow)
                return Error(MembershipValidationTexts.InvalidActivateToken.ToString(Localizer));

            invitationId = br.ReadInt32();
        }
        catch (Exception)
        {
            return Error(MembershipValidationTexts.InvalidActivateToken.ToString(Localizer));
        }

        var userInvitation = uow.Connection.TryById<UserInvitationsRow>(invitationId);
        if (userInvitation == null || userInvitation.IsActive != 1)
            return Error(MembershipValidationTexts.InvalidActivateToken.ToString(Localizer));

        uow.Connection.UpdateById(new UserInvitationsRow
        {
            Id = invitationId,
            Accepted = true
        });

        Cache.InvalidateOnCommit(uow, UserInvitationsRow.Fields);
        uow.Commit();

        return new RedirectResult(
            "~/Account/SignUp?email=" + Uri.EscapeDataString(userInvitation.EmailAddress) +
            "&invitationId=" + Uri.EscapeDataString(userInvitation.Id.ToString())
        );
    }
}