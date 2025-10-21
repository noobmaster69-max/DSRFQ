import { Decorators, EntityGrid } from '@serenity-is/corelib';
import { CostingPartSpecialProcessResultsColumns, CostingPartSpecialProcessResultsRow, CostingPartSpecialProcessResultsService } from '../../ServerTypes/Costing';
import { CostingPartSpecialProcessResultsDialog } from './CostingPartSpecialProcessResultsDialog';

@Decorators.registerClass('DSRFQ.Costing.CostingPartSpecialProcessResultsGrid')
export class CostingPartSpecialProcessResultsGrid extends EntityGrid<CostingPartSpecialProcessResultsRow> {
    protected getColumnsKey() { return CostingPartSpecialProcessResultsColumns.columnsKey; }
    protected getDialogType() { return CostingPartSpecialProcessResultsDialog; }
    protected getRowDefinition() { return CostingPartSpecialProcessResultsRow; }
    protected getService() { return CostingPartSpecialProcessResultsService.baseUrl; }
}