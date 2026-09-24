// HAND-WRITTEN STAND-IN for a sergen-generated file.
//
// sergen 8.8.6 targets net8.0 and this machine has only .NET 6 and .NET 10, so
// `dotnet sergen servertypings` cannot run (and crashes under roll-forward).
// Once a .NET 8 runtime is installed, regenerate and this file is overwritten
// with the real output - the shape below deliberately matches it exactly.
import { fieldsProxy } from '@serenity-is/corelib';

export interface CostingPartBalloonMaskZonesRow {
    Id?: number;
    CostingPartId?: number;
    PageNumber?: number;
    MaskX1?: number;
    MaskY1?: number;
    MaskX2?: number;
    MaskY2?: number;
    InsertDate?: string;
    InsertUserId?: number;
    UpdateDate?: string;
    UpdateUserId?: number;
    DeleteDate?: string;
    DeleteUserId?: number;
    IsActive?: number;
}

export abstract class CostingPartBalloonMaskZonesRow {
    static readonly idProperty = 'Id';
    static readonly localTextPrefix = 'Costing.CostingPartBalloonMaskZones';

    static readonly deletePermission = '?';
    static readonly insertPermission = '?';
    static readonly readPermission = '?';
    static readonly updatePermission = '?';

    static readonly Fields = fieldsProxy<CostingPartBalloonMaskZonesRow>();
}
