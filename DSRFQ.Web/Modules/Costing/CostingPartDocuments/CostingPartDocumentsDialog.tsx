import { Decorators, EntityDialog } from '@serenity-is/corelib';
import { CostingPartDocumentsForm, CostingPartDocumentsRow, CostingPartDocumentsService } from '../../ServerTypes/Costing';

@Decorators.registerClass('DSRFQ.Costing.CostingPartDocumentsDialog')
export class CostingPartDocumentsDialog extends EntityDialog<CostingPartDocumentsRow, any> {
    protected getFormKey() { return CostingPartDocumentsForm.formKey; }
    protected getRowDefinition() { return CostingPartDocumentsRow; }
    protected getService() { return CostingPartDocumentsService.baseUrl; }

    protected form = new CostingPartDocumentsForm(this.idPrefix);
}