import { Decorators, EntityDialog } from '@serenity-is/corelib';
import { CompanyGroupsForm, CompanyGroupsRow, CompanyGroupsService } from '../../ServerTypes/Company';

@Decorators.registerClass('DSRFQ.Company.CompanyGroupsDialog')
export class CompanyGroupsDialog extends EntityDialog<CompanyGroupsRow, any> {
    protected getFormKey() { return CompanyGroupsForm.formKey; }
    protected getRowDefinition() { return CompanyGroupsRow; }
    protected getService() { return CompanyGroupsService.baseUrl; }

    protected form = new CompanyGroupsForm(this.idPrefix);
}