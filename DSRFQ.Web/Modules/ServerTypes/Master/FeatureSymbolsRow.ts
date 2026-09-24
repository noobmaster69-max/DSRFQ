import { getLookup, getLookupAsync, fieldsProxy } from "@serenity-is/corelib";

export interface FeatureSymbolsRow {
    Id?: number;
    FeatureCategoryId?: number;
    Name?: string;
    Symbol?: string;
    Description?: string;
    DifficultyWeight?: number;
    FeatureCategoryName?: string;
    /** "⌖ Position" - the glyph and the name together, which is what the lookup shows. */
    CombinedName?: string;
    InsertDate?: string;
    InsertUserId?: number;
    UpdateDate?: string;
    UpdateUserId?: number;
    DeleteDate?: string;
    DeleteUserId?: number;
    IsActive?: number;
}

export abstract class FeatureSymbolsRow {
    static readonly idProperty = 'Id';
    static readonly nameProperty = 'CombinedName';
    static readonly localTextPrefix = 'Master.FeatureSymbols';
    static readonly lookupKey = 'MasterFeatureSymbols';

    /** @deprecated prefer `getLookupAsync` */
    static getLookup() { return getLookup<FeatureSymbolsRow>('MasterFeatureSymbols') }
    static async getLookupAsync() { return getLookupAsync<FeatureSymbolsRow>('MasterFeatureSymbols') }

    static readonly deletePermission = 'Administration:General';
    static readonly insertPermission = 'Administration:General';
    static readonly readPermission = '?';
    static readonly updatePermission = 'Administration:General';

    static readonly Fields = fieldsProxy<FeatureSymbolsRow>();
}
