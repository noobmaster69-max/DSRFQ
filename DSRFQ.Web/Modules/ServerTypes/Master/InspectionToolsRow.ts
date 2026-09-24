import { getLookup, getLookupAsync, fieldsProxy } from "@serenity-is/corelib";

export interface InspectionToolsRow {
    Id?: number;
    Name?: string;
    Description?: string;
    /** "LM - Digital Lux Meter", or the bare code where there is no description. */
    CombinedName?: string;
    InsertDate?: string;
    InsertUserId?: number;
    UpdateDate?: string;
    UpdateUserId?: number;
    DeleteDate?: string;
    DeleteUserId?: number;
    IsActive?: number;
}

export abstract class InspectionToolsRow {
    static readonly idProperty = 'Id';
    static readonly nameProperty = 'CombinedName';
    static readonly localTextPrefix = 'Master.InspectionTools';
    static readonly lookupKey = 'MasterInspectionTools';

    /** @deprecated prefer `getLookupAsync` */
    static getLookup() { return getLookup<InspectionToolsRow>('MasterInspectionTools') }
    static async getLookupAsync() { return getLookupAsync<InspectionToolsRow>('MasterInspectionTools') }

    static readonly deletePermission = 'Administration:General';
    static readonly insertPermission = 'Administration:General';
    static readonly readPermission = '?';
    static readonly updatePermission = 'Administration:General';

    static readonly Fields = fieldsProxy<InspectionToolsRow>();
}
