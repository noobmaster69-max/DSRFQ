import { ColumnsBase, fieldsProxy } from "@serenity-is/corelib";
import { Column } from "@serenity-is/sleekgrid";
import { WalletTransactionsRow } from "./WalletTransactionsRow";

export interface WalletTransactionsColumns {
    Id: Column<WalletTransactionsRow>;
    UserId: Column<WalletTransactionsRow>;
    CompanyName: Column<WalletTransactionsRow>;
    StripeSessionId: Column<WalletTransactionsRow>;
    StripePaymentIntentId: Column<WalletTransactionsRow>;
    StripeInvoiceId: Column<WalletTransactionsRow>;
    StripeInvoiceUrl: Column<WalletTransactionsRow>;
    Amount: Column<WalletTransactionsRow>;
    Currency: Column<WalletTransactionsRow>;
    Status: Column<WalletTransactionsRow>;
    PaymentStatus: Column<WalletTransactionsRow>;
    CustomerName: Column<WalletTransactionsRow>;
    CustomerEmail: Column<WalletTransactionsRow>;
    InsertDate: Column<WalletTransactionsRow>;
    InsertBy: Column<WalletTransactionsRow>;
    UpdateDate: Column<WalletTransactionsRow>;
    UpdateBy: Column<WalletTransactionsRow>;
    DeleteDate: Column<WalletTransactionsRow>;
    DeleteBy: Column<WalletTransactionsRow>;
}

export class WalletTransactionsColumns extends ColumnsBase<WalletTransactionsRow> {
    static readonly columnsKey = 'Wallet.WalletTransactions';
    static readonly Fields = fieldsProxy<WalletTransactionsColumns>();
}