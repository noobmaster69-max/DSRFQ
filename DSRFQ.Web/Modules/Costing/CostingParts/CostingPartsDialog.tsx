import { Decorators, EntityDialog } from '@serenity-is/corelib';
import { CostingPartsForm, CostingPartsRow, CostingPartsService } from '../../ServerTypes/Costing';

@Decorators.registerClass('DSRFQ.Costing.CostingPartsDialog')
export class CostingPartsDialog extends EntityDialog<CostingPartsRow, any> {
    protected getFormKey() { return CostingPartsForm.formKey; }
    protected getRowDefinition() { return CostingPartsRow; }
    protected getService() { return CostingPartsService.baseUrl; }

    protected form = new CostingPartsForm(this.idPrefix);
    
    constructor() {
        super();
    }
    protected initStructure(){
        
    }
}