using MyRow = DSRFQ.Administration.UserRow;

namespace DSRFQ.AppServices;
public class UserRetrieveService(ITwoLevelCache cache, ISqlConnections sqlConnections)
    : BaseUserRetrieveService<MyRow>(cache, sqlConnections)
{
    protected override UserDefinition ToUserDefinition(MyRow user)
    {
        return new()
        {
            UserId = user.UserId.Value,
            Username = user.Username,
            Email = user.Email,
            MobilePhoneNumber = user.MobilePhoneNumber,
            UserImage = user.UserImage,
            DisplayName = user.DisplayName,
            IsActive = user.IsActive.Value,
            Source = user.Source,
            PasswordHash = user.PasswordHash,
            PasswordSalt = user.PasswordSalt,
            UpdateDate = user.UpdateDate,
            LastDirectoryUpdate = user.LastDirectoryUpdate,
            TwoFactorData = user.TwoFactorData,
            CompanyId = user.CompanyId,
            GroupId = user.GroupId
        };
    }
}