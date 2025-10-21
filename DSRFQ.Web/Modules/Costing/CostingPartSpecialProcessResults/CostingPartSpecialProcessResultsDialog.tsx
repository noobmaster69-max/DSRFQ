import { Decorators, EntityDialog } from '@serenity-is/corelib';
import { CostingPartSpecialProcessResultsForm, CostingPartSpecialProcessResultsRow, CostingPartSpecialProcessResultsService } from '../../ServerTypes/Costing';

@Decorators.registerClass('DSRFQ.Costing.CostingPartSpecialProcessResultsDialog')
export class CostingPartSpecialProcessResultsDialog extends EntityDialog<CostingPartSpecialProcessResultsRow, any> {
    protected getFormKey() { return CostingPartSpecialProcessResultsForm.formKey; }
    protected getRowDefinition() { return CostingPartSpecialProcessResultsRow; }
    protected getService() { return CostingPartSpecialProcessResultsService.baseUrl; }

    protected form = new CostingPartSpecialProcessResultsForm(this.idPrefix);
}