// HAND-WRITTEN STAND-IN for a sergen-generated file.
//
// sergen 8.8.6 targets net8.0 and this machine has only .NET 6 and .NET 10, so
// `dotnet sergen servertypings` cannot run (and crashes under roll-forward).
// Once a .NET 8 runtime is installed, regenerate and this file is overwritten
// with the real output - the shape below deliberately matches it exactly.
import { fieldsProxy } from '@serenity-is/corelib';

export interface CostingPartCostingResultsRow {
    Id?: number;
    CostingPartId?: number;
    CostingCategoryId?: number;
    Name?: string;
    Description?: string;
    Quantity?: number;
    DimensionUnitId?: number;
    DimensionUnit?: string;
    UnitPrice?: number;
    CurrencyId?: number;
    Total?: number;
    IsTimeUnit?: number;
    IsManual?: number;
    /** What the quote was priced on, as new_tsh named it at the time. */
    MachineName?: string;
    /** fa_supplier_equipment.id, which is also dbo.Machines.ID. */
    MachineId?: number;
    // Joined live from dbo.Machines, so these follow the machine record rather
    // than the quote. Not returned by a List unless asked for by name via
    // IncludeColumns - Serenity leaves [Origin] fields out by default.
    /** dbo.Machines.Name, e.g. "MAKINO A61NX-5XR" - without the axis/envelope
     *  that new_tsh packs into MachineName. */
    MachineRealName?: string;
    MachinePicture?: string;
    MachineAxisNumber?: number;
    MachinePrecision?: number;
    MachineCost?: number;
    MachineWorkEnvelopeX?: number;
    MachineWorkEnvelopeY?: number;
    MachineWorkEnvelopeZ?: number;
    MachineWeightLimit?: number;
    MachineDescription?: string;
    InsertDate?: string;
    InsertUserId?: number;
    UpdateDate?: string;
    UpdateUserId?: number;
    DeleteDate?: string;
    DeleteUserId?: number;
    IsActive?: number;
    CostingPartPartNumber?: string;
    DimensionUnitCode?: string;
    CurrencyCode?: string;
}

export abstract class CostingPartCostingResultsRow {
    static readonly idProperty = 'Id';
    static readonly nameProperty = 'Name';
    static readonly localTextPrefix = 'Costing.CostingPartCostingResults';

    static readonly deletePermission = '?';
    static readonly insertPermission = '?';
    static readonly readPermission = '?';
    static readonly updatePermission = '?';

    static readonly Fields = fieldsProxy<CostingPartCostingResultsRow>();
}
