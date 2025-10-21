import { Decorators, EntityGrid } from '@serenity-is/corelib';
import { WeightUnitsColumns, WeightUnitsRow, WeightUnitsService } from '../../ServerTypes/Master';
import { WeightUnitsDialog } from './WeightUnitsDialog';

@Decorators.registerClass('DSRFQ.Master.WeightUnitsGrid')
export class WeightUnitsGrid extends EntityGrid<WeightUnitsRow> {
    protected getColumnsKey() { return WeightUnitsColumns.columnsKey; }
    protected getDialogType() { return WeightUnitsDialog; }
    protected getRowDefinition() { return WeightUnitsRow; }
    protected getService() { return WeightUnitsService.baseUrl; }
}