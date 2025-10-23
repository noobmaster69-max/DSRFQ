import { Decorators, EntityDialog } from '@serenity-is/corelib';
import "../SurfaceTreatmentProcessCosts/SurfaceTreatmentProcessCostsEditor"
import {SurfaceTreatmentProcessesRow} from "../../ServerTypes/Master/SurfaceTreatmentProcessesRow";
import {SurfaceTreatmentProcessesForm} from "../../ServerTypes/Master/SurfaceTreatmentProcessesForm";
import {SurfaceTreatmentProcessesService} from "../../ServerTypes/Master/SurfaceTreatmentProcessesService";

@Decorators.registerClass('DSRFQ.Master.SurfaceTreatmentProcessesDialog')
export class SurfaceTreatmentProcessesDialog extends EntityDialog<SurfaceTreatmentProcessesRow, any> {
    protected getFormKey() { return SurfaceTreatmentProcessesForm.formKey; }
    protected getRowDefinition() { return SurfaceTreatmentProcessesRow; }
    protected getService() { return SurfaceTreatmentProcessesService.baseUrl; }

    protected form = new SurfaceTreatmentProcessesForm(this.idPrefix);
    protected afterLoadEntity() {
        super.afterLoadEntity();
    }
}