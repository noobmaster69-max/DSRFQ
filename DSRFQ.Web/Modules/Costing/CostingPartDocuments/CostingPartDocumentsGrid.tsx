import { Decorators, EntityGrid } from '@serenity-is/corelib';
import { CostingPartDocumentsColumns, CostingPartDocumentsRow, CostingPartDocumentsService } from '../../ServerTypes/Costing';
import { CostingPartDocumentsDialog } from './CostingPartDocumentsDialog';

@Decorators.registerClass('DSRFQ.Costing.CostingPartDocumentsGrid')
export class CostingPartDocumentsGrid extends EntityGrid<CostingPartDocumentsRow> {
    protected getColumnsKey() { return CostingPartDocumentsColumns.columnsKey; }
    protected getDialogType() { return CostingPartDocumentsDialog; }
    protected getRowDefinition() { return CostingPartDocumentsRow; }
    protected getService() { return CostingPartDocumentsService.baseUrl; }
}