namespace DSRFQ.Membership;


[ScriptInclude]
public class SignupPageModel
{
    public string DisplayName { get; set; }
    public string Email { get; set; }
    public int InvitationId { get; set; }
    public string ExternalProviderToken { get; set; }
}