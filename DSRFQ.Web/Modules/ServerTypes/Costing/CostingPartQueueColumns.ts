// HAND-WRITTEN STAND-IN for a sergen-generated file.
//
// sergen 8.8.6 targets net8.0 and this machine has only .NET 6 and .NET 10, so
// `dotnet sergen servertypings` cannot run (and crashes under roll-forward).
// Once a .NET 8 runtime is installed, regenerate and this file is overwritten
// with the real output - the shape below deliberately matches it exactly.
import { ColumnsBase, fieldsProxy } from '@serenity-is/corelib';
import { Column } from '@serenity-is/sleekgrid';
import { CostingPartQueueRow } from './CostingPartQueueRow';

export interface CostingPartQueueColumns {
    Id: Column<CostingPartQueueRow>;
    Status: Column<CostingPartQueueRow>;
    Position: Column<CostingPartQueueRow>;
    Lane: Column<CostingPartQueueRow>;
    CostingPartId: Column<CostingPartQueueRow>;
    PartNumber: Column<CostingPartQueueRow>;
    Revision: Column<CostingPartQueueRow>;
    PartDescription: Column<CostingPartQueueRow>;
    ElapsedSeconds: Column<CostingPartQueueRow>;
    QueuedAt: Column<CostingPartQueueRow>;
    StartedAt: Column<CostingPartQueueRow>;
    FinishedAt: Column<CostingPartQueueRow>;
    Attempt: Column<CostingPartQueueRow>;
    Priority: Column<CostingPartQueueRow>;
    LastError: Column<CostingPartQueueRow>;
    QueueName: Column<CostingPartQueueRow>;
    WorkerId: Column<CostingPartQueueRow>;
}

export class CostingPartQueueColumns extends ColumnsBase<CostingPartQueueRow> {
    static readonly columnsKey = 'Costing.CostingPartQueue';
    static readonly Fields = fieldsProxy<CostingPartQueueColumns>();
}
