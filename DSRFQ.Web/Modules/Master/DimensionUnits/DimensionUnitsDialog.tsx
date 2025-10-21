import { Decorators, EntityDialog } from '@serenity-is/corelib';
import { DimensionUnitsForm, DimensionUnitsRow, DimensionUnitsService } from '../../ServerTypes/Master';

@Decorators.registerClass('DSRFQ.Master.DimensionUnitsDialog')
export class DimensionUnitsDialog extends EntityDialog<DimensionUnitsRow, any> {
    protected getFormKey() { return DimensionUnitsForm.formKey; }
    protected getRowDefinition() { return DimensionUnitsRow; }
    protected getService() { return DimensionUnitsService.baseUrl; }

    protected form = new DimensionUnitsForm(this.idPrefix);
}