import { Decorators, EntityDialog } from '@serenity-is/corelib';
import { SurfaceTreatmentProcessCostsForm, SurfaceTreatmentProcessCostsRow, SurfaceTreatmentProcessCostsService } from '../../ServerTypes/Master';
import {GridEditorDialog} from "@serenity-is/extensions";

@Decorators.registerClass('DSRFQ.Master.SurfaceTreatmentProcessCostsDialog')
export class SurfaceTreatmentProcessCostsDialog extends GridEditorDialog<SurfaceTreatmentProcessCostsRow, any> {
   

    protected getFormKey() { return SurfaceTreatmentProcessCostsForm.formKey; }
    protected getRowDefinition() { return SurfaceTreatmentProcessCostsRow; }
    protected getService() { return SurfaceTreatmentProcessCostsService.baseUrl; }

    protected form :SurfaceTreatmentProcessCostsForm

    afterLoadEntity(){
        super.afterLoadEntity();
        super.updateInterface();
        this.form = new SurfaceTreatmentProcessCostsForm(this.idPrefix);
    }
}