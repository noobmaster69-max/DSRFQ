import { getLookup, getLookupAsync, fieldsProxy } from "@serenity-is/corelib";

export interface GroupsRow {
    Id?: number;
    Name?: string;
    Description?: string;
    CompanyList?: number[];
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

export abstract class GroupsRow {
    static readonly idProperty = 'Id';
    static readonly isActiveProperty = 'IsActive';
    static readonly nameProperty = 'Name';
    static readonly localTextPrefix = 'Company.Groups';
    static readonly lookupKey = 'Groups';

    /** @deprecated use getLookupAsync instead */
    static getLookup() { return getLookup<GroupsRow>('Groups') }
    static async getLookupAsync() { return getLookupAsync<GroupsRow>('Groups') }

    static readonly deletePermission = 'Administration:Group';
    static readonly insertPermission = 'Administration:Group';
    static readonly readPermission = 'Administration:Group';
    static readonly updatePermission = 'Administration:Group';

    static readonly Fields = fieldsProxy<GroupsRow>();
}