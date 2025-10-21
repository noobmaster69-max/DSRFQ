namespace DSRFQ.Modules.Membership;


public class InviteRequest : ServiceRequest
{
    public int InvitedByUserId { get; set; }
    public string DisplayName { get; set; }
    public string Email { get; set; }
    
}