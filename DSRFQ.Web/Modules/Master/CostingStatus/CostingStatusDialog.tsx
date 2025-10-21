import { Decorators, EntityDialog } from '@serenity-is/corelib';
import { CostingStatusForm, CostingStatusRow, CostingStatusService } from '../../ServerTypes/Master';

@Decorators.registerClass('DSRFQ.Master.CostingStatusDialog')
export class CostingStatusDialog extends EntityDialog<CostingStatusRow, any> {
    protected getFormKey() { return CostingStatusForm.formKey; }
    protected getRowDefinition() { return CostingStatusRow; }
    protected getService() { return CostingStatusService.baseUrl; }

    protected form = new CostingStatusForm(this.idPrefix);
}