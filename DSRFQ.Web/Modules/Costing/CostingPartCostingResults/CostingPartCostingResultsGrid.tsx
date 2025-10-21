import { Decorators, EntityGrid } from '@serenity-is/corelib';
import { CostingPartCostingResultsColumns, CostingPartCostingResultsRow, CostingPartCostingResultsService } from '../../ServerTypes/Costing';
import { CostingPartCostingResultsDialog } from './CostingPartCostingResultsDialog';

@Decorators.registerClass('DSRFQ.Costing.CostingPartCostingResultsGrid')
export class CostingPartCostingResultsGrid extends EntityGrid<CostingPartCostingResultsRow> {
    protected getColumnsKey() { return CostingPartCostingResultsColumns.columnsKey; }
    protected getDialogType() { return CostingPartCostingResultsDialog; }
    protected getRowDefinition() { return CostingPartCostingResultsRow; }
    protected getService() { return CostingPartCostingResultsService.baseUrl; }
}