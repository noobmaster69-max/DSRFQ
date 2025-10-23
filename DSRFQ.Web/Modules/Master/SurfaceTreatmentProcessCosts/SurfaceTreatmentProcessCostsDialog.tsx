import { Decorators, EntityDialog } from '@serenity-is/corelib';
import {GridEditorDialog} from "@serenity-is/extensions";
import {SurfaceTreatmentProcessCostsService} from "../../ServerTypes/Master/SurfaceTreatmentProcessCostsService";
import {SurfaceTreatmentProcessCostsForm} from "../../ServerTypes/Master/SurfaceTreatmentProcessCostsForm";
import {SurfaceTreatmentProcessCostsRow} from "../../ServerTypes/Master/SurfaceTreatmentProcessCostsRow";

@Decorators.registerClass('DSRFQ.Master.SurfaceTreatmentProcessCostsDialog')
export class SurfaceTreatmentProcessCostsDialog extends GridEditorDialog<SurfaceTreatmentProcessCostsRow> {
   

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