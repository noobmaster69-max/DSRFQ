// HAND-WRITTEN STAND-IN for a sergen-generated file.
//
// sergen 8.8.6 targets net8.0 and this machine has only .NET 6 and .NET 10, so
// `dotnet sergen servertypings` cannot run (and crashes under roll-forward).
// Once a .NET 8 runtime is installed, regenerate and this file is overwritten
// with the real output - the shape below deliberately matches it exactly.
import { fieldsProxy } from '@serenity-is/corelib';

export interface CostingPartMachineOptionsRow {
    Id?: number;
    CostingPartId?: number;
    CostingPartCostingResultId?: number;
    MachineId?: number;
    HourlyRate?: number;
    CurrencyId?: number;
    LineTotal?: number;
    IsSelected?: number;
    IsRecommended?: number;
    IsUserChoice?: number;
    FitsEnvelope?: number;
    FitsWeight?: number;
    AxisSufficient?: number;
    MachineName?: string;
    MachinePicture?: string;
    MachineAxisNumber?: number;
    MachinePrecision?: number;
    MachineWorkEnvelopeX?: number;
    MachineWorkEnvelopeY?: number;
    MachineWorkEnvelopeZ?: number;
    MachineWeightLimit?: number;
    ProcessName?: string;
    ProcessHours?: number;
    InsertDate?: string;
    InsertUserId?: number;
    UpdateDate?: string;
    UpdateUserId?: number;
    DeleteDate?: string;
    DeleteUserId?: number;
    IsActive?: number;
}

export abstract class CostingPartMachineOptionsRow {
    static readonly idProperty = 'Id';
    static readonly nameProperty = 'MachineName';
    static readonly localTextPrefix = 'Costing.CostingPartMachineOptions';

    static readonly deletePermission = '?';
    static readonly insertPermission = '?';
    static readonly readPermission = '?';
    static readonly updatePermission = '?';

    static readonly Fields = fieldsProxy<CostingPartMachineOptionsRow>();
}
