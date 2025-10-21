import { Decorators, EntityDialog } from '@serenity-is/corelib';
import { RawMaterialCostsForm, RawMaterialCostsRow, RawMaterialCostsService } from '../../ServerTypes/Material';

@Decorators.registerClass('DSRFQ.Material.RawMaterialCostsDialog')
export class RawMaterialCostsDialog extends EntityDialog<RawMaterialCostsRow, any> {
    protected getFormKey() { return RawMaterialCostsForm.formKey; }
    protected getRowDefinition() { return RawMaterialCostsRow; }
    protected getService() { return RawMaterialCostsService.baseUrl; }

    protected form = new RawMaterialCostsForm(this.idPrefix);
}