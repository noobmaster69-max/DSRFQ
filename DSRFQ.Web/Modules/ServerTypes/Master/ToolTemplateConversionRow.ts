import { fieldsProxy } from '@serenity-is/corelib';

export interface ToolTemplateConversionRow {
    Id?: number;
    Name?: string;
    LogoPicture?: string;
    TablePicture?: string;
    ReplacementText?: string;
    RevisionX1?: number;
    RevisionY1?: number;
    RevisionX2?: number;
    RevisionY2?: number;
    PartNumberX1?: number;
    PartNumberY1?: number;
    PartNumberX2?: number;
    PartNumberY2?: number;
    DescriptionX1?: number;
    DescriptionY1?: number;
    DescriptionX2?: number;
    DescriptionY2?: number;
    MaterialX1?: number;
    MaterialY1?: number;
    MaterialX2?: number;
    MaterialY2?: number;
    WeightX1?: number;
    WeightY1?: number;
    WeightX2?: number;
    WeightY2?: number;
    AngularToleranceX1?: number;
    AngularToleranceY1?: number;
    AngularToleranceX2?: number;
    AngularToleranceY2?: number;
    SurfaceX1?: number;
    SurfaceY1?: number;
    SurfaceX2?: number;
    SurfaceY2?: number;
    Tolerance1X1?: number;
    Tolerance1Y1?: number;
    Tolerance1X2?: number;
    Tolerance1Y2?: number;
    Tolerance2X1?: number;
    Tolerance2Y1?: number;
    Tolerance2X2?: number;
    Tolerance2Y2?: number;
    Tolerance3X1?: number;
    Tolerance3Y1?: number;
    Tolerance3X2?: number;
    Tolerance3Y2?: number;
    Tolerance4X1?: number;
    Tolerance4Y1?: number;
    Tolerance4X2?: number;
    Tolerance4Y2?: number;
    Default?: boolean;
    InsertDate?: string;
    InsertUserId?: number;
    UpdateDate?: string;
    UpdateUserId?: number;
    DeleteDate?: string;
    DeleteUserId?: number;
    IsActive?: number;
}

export abstract class ToolTemplateConversionRow {
    static readonly idProperty = 'Id';
    static readonly nameProperty = 'Name';
    static readonly localTextPrefix = 'Master.ToolTemplateConversion';
    static readonly lookupKey = 'ToolTemplateConversion';

    static async getLookupAsync() {
        const { getLookupAsync } = await import('@serenity-is/corelib');
        return getLookupAsync<ToolTemplateConversionRow>('ToolTemplateConversion');
    }

    static readonly deletePermission = 'Master:Tool Template:Delete';
    static readonly insertPermission = 'Master:Tool Template:Insert';
    static readonly readPermission = 'Master:Tool Template:View';
    static readonly updatePermission = 'Master:Tool Template:Update';

    static readonly Fields = fieldsProxy<ToolTemplateConversionRow>();
}
