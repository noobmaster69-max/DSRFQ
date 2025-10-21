import { Decorators, EntityDialog } from '@serenity-is/corelib';
import { WeightUnitsForm, WeightUnitsRow, WeightUnitsService } from '../../ServerTypes/Master';

@Decorators.registerClass('DSRFQ.Master.WeightUnitsDialog')
export class WeightUnitsDialog extends EntityDialog<WeightUnitsRow, any> {
    protected getFormKey() { return WeightUnitsForm.formKey; }
    protected getRowDefinition() { return WeightUnitsRow; }
    protected getService() { return WeightUnitsService.baseUrl; }

    protected form = new WeightUnitsForm(this.idPrefix);
}