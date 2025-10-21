import { Decorators, EntityGrid } from '@serenity-is/corelib';
import { SurfaceTreatmentProcessesColumns, SurfaceTreatmentProcessesRow, SurfaceTreatmentProcessesService } from '../../ServerTypes/Master';
import { SurfaceTreatmentProcessesDialog } from './SurfaceTreatmentProcessesDialog';
import "../SurfaceTreatmentProcessCosts/SurfaceTreatmentProcessCostsEditor"

@Decorators.registerClass('DSRFQ.Master.SurfaceTreatmentProcessesGrid')
export class SurfaceTreatmentProcessesGrid extends EntityGrid<SurfaceTreatmentProcessesRow> {
    protected getColumnsKey() { return SurfaceTreatmentProcessesColumns.columnsKey; }
    protected getDialogType() { return SurfaceTreatmentProcessesDialog; }
    protected getRowDefinition() { return SurfaceTreatmentProcessesRow; }
    protected getService() { return SurfaceTreatmentProcessesService.baseUrl; }
}