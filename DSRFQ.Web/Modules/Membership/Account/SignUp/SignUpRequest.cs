namespace DSRFQ.Membership;

public class SignUpRequest : ServiceRequest
{
    public string DisplayName { get; set; }
    public string Email { get; set; }
    public string Password { get; set; }
    public string Recaptcha { get; set; }
    public string ExternalProviderToken { get; set; }
    public int UserInvitationId { get; set; }
}