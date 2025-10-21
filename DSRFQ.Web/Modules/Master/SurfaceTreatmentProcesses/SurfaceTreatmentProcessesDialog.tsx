import { Decorators, EntityDialog } from '@serenity-is/corelib';
import { SurfaceTreatmentProcessesForm, SurfaceTreatmentProcessesRow, SurfaceTreatmentProcessesService } from '../../ServerTypes/Master';
import "../SurfaceTreatmentProcessCosts/SurfaceTreatmentProcessCostsEditor"

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