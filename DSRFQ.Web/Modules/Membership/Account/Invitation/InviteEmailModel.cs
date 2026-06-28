namespace DSRFQ.Membership;

public class InviteEmailModel
{
    public string EmailAddress { get; set; }
    public string DisplayName { get; set; }
    public string ActivateLink { get; set; }
    public string BaseUrl { get; set; }
}