import {Authorization, Decorators, EntityDialog} from '@serenity-is/corelib';
import { MaterialsForm, MaterialsRow, MaterialsService } from '../../ServerTypes/Material';
import userDefinition = Authorization.userDefinition;

@Decorators.registerClass('DSRFQ.Material.MaterialsDialog')
export class MaterialsDialog extends EntityDialog<MaterialsRow, any> {
    protected getFormKey() { return MaterialsForm.formKey; }
    protected getRowDefinition() { return MaterialsRow; }
    protected getService() { return MaterialsService.baseUrl; }

    protected form = new MaterialsForm(this.idPrefix);
    
    constructor() {
        super();
        
        
    }
    protected updateInterface() {
        console.log(userDefinition.Permissions)
        console.log(this.getRowDefinition().updatePermission)
        super.updateInterface();
    }
}