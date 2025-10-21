import { Decorators, EntityDialog } from '@serenity-is/corelib';
import { CostingPartDocumentImagesForm, CostingPartDocumentImagesRow, CostingPartDocumentImagesService } from '../../ServerTypes/Costing';

@Decorators.registerClass('DSRFQ.Costing.CostingPartDocumentImagesDialog')
export class CostingPartDocumentImagesDialog extends EntityDialog<CostingPartDocumentImagesRow, any> {
    protected getFormKey() { return CostingPartDocumentImagesForm.formKey; }
    protected getRowDefinition() { return CostingPartDocumentImagesRow; }
    protected getService() { return CostingPartDocumentImagesService.baseUrl; }

    protected form = new CostingPartDocumentImagesForm(this.idPrefix);
}