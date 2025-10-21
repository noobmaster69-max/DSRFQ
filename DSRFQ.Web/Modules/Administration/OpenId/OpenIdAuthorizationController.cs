using OpenIddict.Abstractions;
using Serenity.Pro.OpenIddict;

namespace DSRFQ.Administration.Pages;
public class OpenIdAuthorizationController(
    IUserPasswordValidator userPasswordValidator,
    IUserRetrieveService userRetriever,
    IOptionsMonitor<OpenIdSettings> options = null,
    IOpenIddictApplicationManager applicationManager = null,
    IOpenIddictAuthorizationManager authorizationManager = null,
    ITextLocalizer textLocalizer = null) : OpenIdAuthorizationControllerBase(userRetriever, options, applicationManager, authorizationManager, textLocalizer)
{
    private readonly IUserPasswordValidator userPasswordValidator = userPasswordValidator ?? throw new ArgumentNullException(nameof(userPasswordValidator));

    protected override bool ValidatePassword(string username, string password)
    {
        return !string.IsNullOrEmpty(username) &&
               userPasswordValidator.Validate(ref username, password) == PasswordValidationResult.Valid;
    }
}
