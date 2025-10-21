using System.Security.Claims;

namespace DSRFQ.AppServices;

public class CompanyUserClaimCreator(IUserRetrieveService userRetriever) : DefaultUserClaimCreator(userRetriever)
{
    protected override void AddClaims(ClaimsIdentity identity, IUserDefinition userDefinition)
    {
        base.AddClaims(identity, userDefinition);
        identity.AddClaim(new Claim("CompanyId", (userDefinition as UserDefinition).CompanyId.ToString()));
    }
}