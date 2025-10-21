import { Decorators, EntityGrid } from '@serenity-is/corelib';
import { SurfaceTreatmentProcessCostsColumns, SurfaceTreatmentProcessCostsRow, SurfaceTreatmentProcessCostsService } from '../../ServerTypes/Master';
import { SurfaceTreatmentProcessCostsDialog } from './SurfaceTreatmentProcessCostsDialog';

@Decorators.registerClass('DSRFQ.Master.SurfaceTreatmentProcessCostsGrid')
export class SurfaceTreatmentProcessCostsGrid extends EntityGrid<SurfaceTreatmentProcessCostsRow> {
    protected getColumnsKey() { return SurfaceTreatmentProcessCostsColumns.columnsKey; }
    protected getDialogType() { return SurfaceTreatmentProcessCostsDialog; }
    protected getRowDefinition() { return SurfaceTreatmentProcessCostsRow; }
    protected getService() { return SurfaceTreatmentProcessCostsService.baseUrl; }
}