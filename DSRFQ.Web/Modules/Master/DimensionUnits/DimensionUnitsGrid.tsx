import { Decorators, EntityGrid } from '@serenity-is/corelib';
import { DimensionUnitsColumns, DimensionUnitsRow, DimensionUnitsService } from '../../ServerTypes/Master';
import { DimensionUnitsDialog } from './DimensionUnitsDialog';

@Decorators.registerClass('DSRFQ.Master.DimensionUnitsGrid')
export class DimensionUnitsGrid extends EntityGrid<DimensionUnitsRow> {
    protected getColumnsKey() { return DimensionUnitsColumns.columnsKey; }
    protected getDialogType() { return DimensionUnitsDialog; }
    protected getRowDefinition() { return DimensionUnitsRow; }
    protected getService() { return DimensionUnitsService.baseUrl; }
}