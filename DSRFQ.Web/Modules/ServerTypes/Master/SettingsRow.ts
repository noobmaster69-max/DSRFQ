import { fieldsProxy } from "@serenity-is/corelib";

export interface SettingsRow {
    Id?: number;
    /** Create balloons for datums no recognised text covered. */
    DatumAddMissing?: boolean;
    /** Floor for added balloons only, on top of the API's own 0.5. */
    DatumAddMinConfidence?: number;
    /** "-", "." or "/" - never "_", which means a repeated instance. */
    SubNumberSeparator?: string;
    /** JSON: ToleranceSettings from BallooningTolerance.ts. */
    DefaultToleranceJson?: string;
    /** JSON: string[] of shop-wide noise phrases. */
    AlwaysFilterKeywords?: string;
    /** JSON: DimensionFilterSettings from BallooningDimensionFilter.ts. */
    DimensionFiltersJson?: string;
    /** JSON: BubbleStyle defaults (BallooningStyle.ts). */
    BubbleStyleJson?: string;
    /** JSON: string[] - number categories in priority order. */
    PartitionOrderJson?: string;
    /** JSON: SymbolFilterSettings. */
    SymbolFilterJson?: string;
    /** JSON: PdfExportOptions. */
    PdfExportJson?: string;
    /** JSON: EditorDefaults (default inspection tool, recognition options). */
    EditorDefaultsJson?: string;
    InsertDate?: string;
    InsertUserId?: number;
    UpdateDate?: string;
    UpdateUserId?: number;
}

export abstract class SettingsRow {
    static readonly idProperty = 'Id';
    static readonly localTextPrefix = 'Master.Settings';

    static readonly readPermission = '?';
    static readonly updatePermission = 'Administration:General';

    static readonly Fields = fieldsProxy<SettingsRow>();
}
