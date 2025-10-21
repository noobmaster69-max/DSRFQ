import { ColumnsBase, fieldsProxy } from "@serenity-is/corelib";
import { Column } from "@serenity-is/sleekgrid";
import { WalletTransactionItemsRow } from "./WalletTransactionItemsRow";

export interface WalletTransactionItemsColumns {
    Id: Column<WalletTransactionItemsRow>;
    WalletTransactionStripeSessionId: Column<WalletTransactionItemsRow>;
    ItemId: Column<WalletTransactionItemsRow>;
    Description: Column<WalletTransactionItemsRow>;
    ProductId: Column<WalletTransactionItemsRow>;
    PriceId: Column<WalletTransactionItemsRow>;
    AmountDiscount: Column<WalletTransactionItemsRow>;
    AmountSubtotal: Column<WalletTransactionItemsRow>;
    AmountTax: Column<WalletTransactionItemsRow>;
    AmountTotal: Column<WalletTransactionItemsRow>;
    Quantity: Column<WalletTransactionItemsRow>;
    Currency: Column<WalletTransactionItemsRow>;
    InsertDate: Column<WalletTransactionItemsRow>;
    InsertBy: Column<WalletTransactionItemsRow>;
    UpdateDate: Column<WalletTransactionItemsRow>;
    UpdateBy: Column<WalletTransactionItemsRow>;
    DeleteDate: Column<WalletTransactionItemsRow>;
    DeleteBy: Column<WalletTransactionItemsRow>;
}

export class WalletTransactionItemsColumns extends ColumnsBase<WalletTransactionItemsRow> {
    static readonly columnsKey = 'Wallet.WalletTransactionItems';
    static readonly Fields = fieldsProxy<WalletTransactionItemsColumns>();
}