namespace DSRFQ.Membership;

[ScriptInclude]
public class LoginPageModel
{
    public string ActivatedUser { get; set; }
    public List<string> Providers { get; set; }
    public bool IsPublicDemo { get; set; }
}