import { Decorators, EntityDialog } from '@serenity-is/corelib';
import { WalletTransactionsForm, WalletTransactionsRow, WalletTransactionsService } from '../../ServerTypes/Wallet';

@Decorators.registerClass('DSRFQ.Wallet.WalletTransactionsDialog')
export class WalletTransactionsDialog extends EntityDialog<WalletTransactionsRow, any> {
    protected getFormKey() { return WalletTransactionsForm.formKey; }
    protected getRowDefinition() { return WalletTransactionsRow; }
    protected getService() { return WalletTransactionsService.baseUrl; }

    protected form = new WalletTransactionsForm(this.idPrefix);
}