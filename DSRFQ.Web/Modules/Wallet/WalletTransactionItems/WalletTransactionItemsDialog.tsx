import { Decorators, EntityDialog } from '@serenity-is/corelib';
import { WalletTransactionItemsForm, WalletTransactionItemsRow, WalletTransactionItemsService } from '../../ServerTypes/Wallet';

@Decorators.registerClass('DSRFQ.Wallet.WalletTransactionItemsDialog')
export class WalletTransactionItemsDialog extends EntityDialog<WalletTransactionItemsRow, any> {
    protected getFormKey() { return WalletTransactionItemsForm.formKey; }
    protected getRowDefinition() { return WalletTransactionItemsRow; }
    protected getService() { return WalletTransactionItemsService.baseUrl; }

    protected form = new WalletTransactionItemsForm(this.idPrefix);
}