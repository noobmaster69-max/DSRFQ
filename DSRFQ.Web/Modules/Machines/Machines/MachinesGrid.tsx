import { Decorators, EntityGrid } from '@serenity-is/corelib';
import { MachinesColumns, MachinesRow, MachinesService } from '../../ServerTypes/Machines';
import { MachinesDialog } from './MachinesDialog';

// Side-effect import. MachinesColumns declares [InlineImageFormatter] on
// Picture, and the generated columns script names the formatter as a string,
// so the class has to be in this page's bundle for Serenity to resolve it --
// without it the grid throws "formatter class not found" before it renders.
// Nothing below references it directly, hence the bare import.
import "@/Common/Formatters/InlineImageFormatter";

@Decorators.registerClass('DSRFQ.Machines.MachinesGrid')
export class MachinesGrid extends EntityGrid<MachinesRow> {
    protected getColumnsKey() { return MachinesColumns.columnsKey; }
    protected getDialogType() { return MachinesDialog; }
    protected getRowDefinition() { return MachinesRow; }
    protected getService() { return MachinesService.baseUrl; }
}