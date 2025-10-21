import { getLookup, getLookupAsync, fieldsProxy } from "@serenity-is/corelib";

export interface UserInvitationsRow {
    Id?: number;
    InvitedByUserId?: number;
    EmailAddress?: string;
    InvitedByUserName?: string;
    Accepted?: boolean;
    InsertUserId?: number;
    InsertDate?: string;
    InsertBy?: string;
    UpdateUserId?: number;
    UpdateDate?: string;
    UpdateBy?: string;
    DeleteUserId?: number;
    DeleteDate?: string;
    DeleteBy?: string;
    IsActive?: number;
}

export abstract class UserInvitationsRow {
    static readonly idProperty = 'Id';
    static readonly isActiveProperty = 'IsActive';
    static readonly nameProperty = 'EmailAddress';
    static readonly localTextPrefix = 'Administration.UserInvitations';
    static readonly lookupKey = 'UserInvitations';

    /** @deprecated use getLookupAsync instead */
    static getLookup() { return getLookup<UserInvitationsRow>('UserInvitations') }
    static async getLookupAsync() { return getLookupAsync<UserInvitationsRow>('UserInvitations') }

    static readonly deletePermission = '?';
    static readonly insertPermission = '?';
    static readonly readPermission = 'Administration:Security';
    static readonly updatePermission = '?';

    static readonly Fields = fieldsProxy<UserInvitationsRow>();
}