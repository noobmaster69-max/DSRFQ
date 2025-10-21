import { Decorators, EntityGrid } from '@serenity-is/corelib';
import { WalletTransactionsColumns, WalletTransactionsRow, WalletTransactionsService } from '../../ServerTypes/Wallet';
import { WalletTransactionsDialog } from './WalletTransactionsDialog';

@Decorators.registerClass('DSRFQ.Wallet.WalletTransactionsGrid')
export class WalletTransactionsGrid extends EntityGrid<WalletTransactionsRow> {
    protected getColumnsKey() { return WalletTransactionsColumns.columnsKey; }
    protected getDialogType() { return WalletTransactionsDialog; }
    protected getRowDefinition() { return WalletTransactionsRow; }
    protected getService() { return WalletTransactionsService.baseUrl; }
}