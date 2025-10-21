import { Decorators, EntityGrid } from '@serenity-is/corelib';
import { CostingPartBomResultsColumns, CostingPartBomResultsRow, CostingPartBomResultsService } from '../../ServerTypes/Costing';
import { CostingPartBomResultsDialog } from './CostingPartBomResultsDialog';

@Decorators.registerClass('DSRFQ.Costing.CostingPartBomResultsGrid')
export class CostingPartBomResultsGrid extends EntityGrid<CostingPartBomResultsRow> {
    protected getColumnsKey() { return CostingPartBomResultsColumns.columnsKey; }
    protected getDialogType() { return CostingPartBomResultsDialog; }
    protected getRowDefinition() { return CostingPartBomResultsRow; }
    protected getService() { return CostingPartBomResultsService.baseUrl; }
}