import { Decorators, EntityDialog } from '@serenity-is/corelib';
import { CostingPartBomResultsForm, CostingPartBomResultsRow, CostingPartBomResultsService } from '../../ServerTypes/Costing';

@Decorators.registerClass('DSRFQ.Costing.CostingPartBomResultsDialog')
export class CostingPartBomResultsDialog extends EntityDialog<CostingPartBomResultsRow, any> {
    protected getFormKey() { return CostingPartBomResultsForm.formKey; }
    protected getRowDefinition() { return CostingPartBomResultsRow; }
    protected getService() { return CostingPartBomResultsService.baseUrl; }

    protected form = new CostingPartBomResultsForm(this.idPrefix);
}