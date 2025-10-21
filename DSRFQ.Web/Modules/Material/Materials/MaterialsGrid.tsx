import { Decorators, EntityGrid } from '@serenity-is/corelib';
import { MaterialsColumns, MaterialsRow, MaterialsService } from '../../ServerTypes/Material';
import { MaterialsDialog } from './MaterialsDialog';

@Decorators.registerClass('DSRFQ.Material.MaterialsGrid')
export class MaterialsGrid extends EntityGrid<MaterialsRow> {
    protected getColumnsKey() { return MaterialsColumns.columnsKey; }
    protected getDialogType() { return MaterialsDialog; }
    protected getRowDefinition() { return MaterialsRow; }
    protected getService() { return MaterialsService.baseUrl; }
}