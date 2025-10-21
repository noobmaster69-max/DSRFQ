import { Decorators, EntityGrid } from '@serenity-is/corelib';
import { MachinesColumns, MachinesRow, MachinesService } from '../../ServerTypes/Machines';
import { MachinesDialog } from './MachinesDialog';

@Decorators.registerClass('DSRFQ.Machines.MachinesGrid')
export class MachinesGrid extends EntityGrid<MachinesRow> {
    protected getColumnsKey() { return MachinesColumns.columnsKey; }
    protected getDialogType() { return MachinesDialog; }
    protected getRowDefinition() { return MachinesRow; }
    protected getService() { return MachinesService.baseUrl; }
}