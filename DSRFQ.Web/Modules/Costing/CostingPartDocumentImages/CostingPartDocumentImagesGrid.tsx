import { Decorators, EntityGrid } from '@serenity-is/corelib';
import { CostingPartDocumentImagesColumns, CostingPartDocumentImagesRow, CostingPartDocumentImagesService } from '../../ServerTypes/Costing';
import { CostingPartDocumentImagesDialog } from './CostingPartDocumentImagesDialog';

@Decorators.registerClass('DSRFQ.Costing.CostingPartDocumentImagesGrid')
export class CostingPartDocumentImagesGrid extends EntityGrid<CostingPartDocumentImagesRow> {
    protected getColumnsKey() { return CostingPartDocumentImagesColumns.columnsKey; }
    protected getDialogType() { return CostingPartDocumentImagesDialog; }
    protected getRowDefinition() { return CostingPartDocumentImagesRow; }
    protected getService() { return CostingPartDocumentImagesService.baseUrl; }
}