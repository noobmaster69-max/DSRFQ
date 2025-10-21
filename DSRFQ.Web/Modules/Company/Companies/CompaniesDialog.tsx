import { Decorators, EntityDialog } from '@serenity-is/corelib';
import { CompaniesForm, CompaniesRow, CompaniesService } from '../../ServerTypes/Company';

@Decorators.registerClass('DSRFQ.Company.CompaniesDialog')
export class CompaniesDialog extends EntityDialog<CompaniesRow, any> {
    protected getFormKey() { return CompaniesForm.formKey; }
    protected getRowDefinition() { return CompaniesRow; }
    protected getService() { return CompaniesService.baseUrl; }

    protected form = new CompaniesForm(this.idPrefix);
}