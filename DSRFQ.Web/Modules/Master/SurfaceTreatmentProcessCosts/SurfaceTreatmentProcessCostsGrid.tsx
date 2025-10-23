import { Decorators, EntityGrid } from '@serenity-is/corelib';
import { SurfaceTreatmentProcessCostsDialog } from './SurfaceTreatmentProcessCostsDialog';
import {SurfaceTreatmentProcessCostsColumns} from "../../ServerTypes/Master/SurfaceTreatmentProcessCostsColumns";
import {SurfaceTreatmentProcessCostsRow} from "../../ServerTypes/Master/SurfaceTreatmentProcessCostsRow";
import {SurfaceTreatmentProcessCostsService} from "../../ServerTypes/Master/SurfaceTreatmentProcessCostsService";

@Decorators.registerClass('DSRFQ.Master.SurfaceTreatmentProcessCostsGrid')
export class SurfaceTreatmentProcessCostsGrid extends EntityGrid<SurfaceTreatmentProcessCostsRow> {
    protected getColumnsKey() { return SurfaceTreatmentProcessCostsColumns.columnsKey; }
    protected getDialogType() { return SurfaceTreatmentProcessCostsDialog; }
    protected getRowDefinition() { return SurfaceTreatmentProcessCostsRow; }
    protected getService() { return SurfaceTreatmentProcessCostsService.baseUrl; }
}