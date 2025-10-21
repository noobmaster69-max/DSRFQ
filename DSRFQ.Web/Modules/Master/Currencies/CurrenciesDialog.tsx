import { Decorators, EntityDialog } from '@serenity-is/corelib';
import { CurrenciesForm, CurrenciesRow, CurrenciesService } from '../../ServerTypes/Master';

@Decorators.registerClass('DSRFQ.Master.CurrenciesDialog')
export class CurrenciesDialog extends EntityDialog<CurrenciesRow, any> {
    protected getFormKey() { return CurrenciesForm.formKey; }
    protected getRowDefinition() { return CurrenciesRow; }
    protected getService() { return CurrenciesService.baseUrl; }

    protected form = new CurrenciesForm(this.idPrefix);
}