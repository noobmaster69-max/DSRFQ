import { Decorators, EntityGrid } from '@serenity-is/corelib';
import { WalletTransactionItemsColumns, WalletTransactionItemsRow, WalletTransactionItemsService } from '../../ServerTypes/Wallet';
import { WalletTransactionItemsDialog } from './WalletTransactionItemsDialog';

@Decorators.registerClass('DSRFQ.Wallet.WalletTransactionItemsGrid')
export class WalletTransactionItemsGrid extends EntityGrid<WalletTransactionItemsRow> {
    protected getColumnsKey() { return WalletTransactionItemsColumns.columnsKey; }
    protected getDialogType() { return WalletTransactionItemsDialog; }
    protected getRowDefinition() { return WalletTransactionItemsRow; }
    protected getService() { return WalletTransactionItemsService.baseUrl; }
}