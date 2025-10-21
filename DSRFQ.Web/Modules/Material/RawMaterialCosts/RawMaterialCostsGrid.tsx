import { Decorators, EntityGrid } from '@serenity-is/corelib';
import { RawMaterialCostsColumns, RawMaterialCostsRow, RawMaterialCostsService } from '../../ServerTypes/Material';
import { RawMaterialCostsDialog } from './RawMaterialCostsDialog';

@Decorators.registerClass('DSRFQ.Material.RawMaterialCostsGrid')
export class RawMaterialCostsGrid extends EntityGrid<RawMaterialCostsRow> {
    protected getColumnsKey() { return RawMaterialCostsColumns.columnsKey; }
    protected getDialogType() { return RawMaterialCostsDialog; }
    protected getRowDefinition() { return RawMaterialCostsRow; }
    protected getService() { return RawMaterialCostsService.baseUrl; }
}