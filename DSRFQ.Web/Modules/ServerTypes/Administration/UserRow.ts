import { getLookup, getLookupAsync, fieldsProxy } from "@serenity-is/corelib";

export interface UserRow {
    UserId?: number;
    Username?: string;
    Source?: string;
    DisplayName?: string;
    Email?: string;
    MobilePhoneNumber?: string;
    UserImage?: string;
    Password?: string;
    IsActive?: number;
    PasswordConfirm?: string;
    LastDirectoryUpdate?: string;
    ImpersonationToken?: string;
    Roles?: number[];
    CompanyId?: number;
    CompanyName?: string;
    GroupId?: number;
    GroupName?: string;
    CompanyGroupList?: string;
    UserInvitationId?: number;
    InvitedByUserId?: number;
    InsertUserId?: number;
    InsertDate?: string;
    UpdateUserId?: number;
    UpdateDate?: string;
}

export abstract class UserRow {
    static readonly idProperty = 'UserId';
    static readonly isActiveProperty = 'IsActive';
    static readonly nameProperty = 'Username';
    static readonly localTextPrefix = 'Administration.User';
    static readonly lookupKey = 'Administration.User';

    /** @deprecated use getLookupAsync instead */
    static getLookup() { return getLookup<UserRow>('Administration.User') }
    static async getLookupAsync() { return getLookupAsync<UserRow>('Administration.User') }

    static readonly deletePermission = 'Administration:Security';
    static readonly insertPermission = 'Administration:Security';
    static readonly readPermission = 'Administration:Security';
    static readonly updatePermission = 'Administration:Security';

    static readonly Fields = fieldsProxy<UserRow>();
}