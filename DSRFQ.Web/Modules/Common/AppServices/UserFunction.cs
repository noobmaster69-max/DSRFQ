using System.Security.Claims;

namespace DSRFQ.AppServices;

public static class ClaimsPrincipalExtensions
{
    public static int? GetCompanyId(this ClaimsPrincipal user)
    {
        if (user is null)
            throw new ArgumentNullException(nameof(user));

        var companyClaim = user.Claims.FirstOrDefault(x => x.Type == "CompanyId");
        if (string.IsNullOrEmpty(companyClaim?.Value))
            return null;

        if (int.TryParse(companyClaim.Value, out var companyId))
            return companyId;

        return null;
        
    }
    public static int? GetGroupId(this ClaimsPrincipal user)
    {
        if (user is null)
            throw new ArgumentNullException(nameof(user));

        var groupClaim = user.Claims.FirstOrDefault(x => x.Type == "GroupId");
        if (string.IsNullOrEmpty(groupClaim?.Value))
            return null;

        if (int.TryParse(groupClaim.Value, out var groupId))
            return groupId;

        return null;
        
    }
}