// HAND-WRITTEN STAND-IN for a sergen-generated file.
//
// sergen 8.8.6 targets net8.0 and this machine has only .NET 6 and .NET 10, so
// `dotnet sergen servertypings` cannot run (and crashes under roll-forward).
// Once a .NET 8 runtime is installed, regenerate and this file is overwritten
// with the real output - the shape below deliberately matches it exactly.
import { fieldsProxy } from '@serenity-is/corelib';

export interface CostingPartBalloonAreasRow {
    Id?: number;
    CostingPartId?: number;
    PageNumber?: number;
    OrderIndex?: number;
    AreaX1?: number;
    AreaY1?: number;
    AreaX2?: number;
    AreaY2?: number;
    SortMode?: string;
    StartAngle?: number;
    Label?: string;
    InsertDate?: string;
    InsertUserId?: number;
    UpdateDate?: string;
    UpdateUserId?: number;
    DeleteDate?: string;
    DeleteUserId?: number;
    IsActive?: number;
}

export abstract class CostingPartBalloonAreasRow {
    static readonly idProperty = 'Id';
    static readonly nameProperty = 'Label';
    static readonly localTextPrefix = 'Costing.CostingPartBalloonAreas';

    static readonly deletePermission = '?';
    static readonly insertPermission = '?';
    static readonly readPermission = '?';
    static readonly updatePermission = '?';

    static readonly Fields = fieldsProxy<CostingPartBalloonAreasRow>();
}
