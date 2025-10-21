import { Decorators, EntityGrid } from '@serenity-is/corelib';
import { VolumeUnitsColumns, VolumeUnitsRow, VolumeUnitsService } from '../../ServerTypes/Master';
import { VolumeUnitsDialog } from './VolumeUnitsDialog';

@Decorators.registerClass('DSRFQ.Master.VolumeUnitsGrid')
export class VolumeUnitsGrid extends EntityGrid<VolumeUnitsRow> {
    protected getColumnsKey() { return VolumeUnitsColumns.columnsKey; }
    protected getDialogType() { return VolumeUnitsDialog; }
    protected getRowDefinition() { return VolumeUnitsRow; }
    protected getService() { return VolumeUnitsService.baseUrl; }
}