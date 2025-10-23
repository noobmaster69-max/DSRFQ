import { Decorators, EntityGrid } from '@serenity-is/corelib';
import { SurfaceTreatmentProcessesDialog } from './SurfaceTreatmentProcessesDialog';
import "../SurfaceTreatmentProcessCosts/SurfaceTreatmentProcessCostsEditor"
import {SurfaceTreatmentProcessesColumns} from "../../ServerTypes/Master/SurfaceTreatmentProcessesColumns";
import {SurfaceTreatmentProcessesRow} from "../../ServerTypes/Master/SurfaceTreatmentProcessesRow";
import {SurfaceTreatmentProcessesService} from "../../ServerTypes/Master/SurfaceTreatmentProcessesService";

@Decorators.registerClass('DSRFQ.Master.SurfaceTreatmentProcessesGrid')
export class SurfaceTreatmentProcessesGrid extends EntityGrid<SurfaceTreatmentProcessesRow> {
    protected getColumnsKey() { return SurfaceTreatmentProcessesColumns.columnsKey; }
    protected getDialogType() { return SurfaceTreatmentProcessesDialog; }
    protected getRowDefinition() { return SurfaceTreatmentProcessesRow; }
    protected getService() { return SurfaceTreatmentProcessesService.baseUrl; }
}