import { Decorators, EntityDialog } from '@serenity-is/corelib';
import { CostingPartCostingResultsForm, CostingPartCostingResultsRow, CostingPartCostingResultsService } from '../../ServerTypes/Costing';

@Decorators.registerClass('DSRFQ.Costing.CostingPartCostingResultsDialog')
export class CostingPartCostingResultsDialog extends EntityDialog<CostingPartCostingResultsRow, any> {
    protected getFormKey() { return CostingPartCostingResultsForm.formKey; }
    protected getRowDefinition() { return CostingPartCostingResultsRow; }
    protected getService() { return CostingPartCostingResultsService.baseUrl; }

    protected form = new CostingPartCostingResultsForm(this.idPrefix);
}