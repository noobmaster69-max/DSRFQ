import { getLookup, getLookupAsync, fieldsProxy } from "@serenity-is/corelib";

export interface WalletTransactionsRow {
    Id?: number;
    UserId?: number;
    CompanyId?: number;
    StripeSessionId?: string;
    StripePaymentIntentId?: string;
    StripeInvoiceId?: string;
    StripeInvoiceUrl?: string;
    Amount?: number;
    Currency?: string;
    Status?: string;
    PaymentStatus?: string;
    CustomerName?: string;
    CustomerEmail?: string;
    CompanyName?: string;
    InsertUserId?: number;
    InsertDate?: string;
    InsertBy?: string;
    UpdateUserId?: number;
    UpdateDate?: string;
    UpdateBy?: string;
    DeleteUserId?: number;
    DeleteDate?: string;
    DeleteBy?: string;
    IsActive?: number;
}

export abstract class WalletTransactionsRow {
    static readonly idProperty = 'Id';
    static readonly isActiveProperty = 'IsActive';
    static readonly nameProperty = 'StripeSessionId';
    static readonly localTextPrefix = 'Wallet.WalletTransactions';
    static readonly lookupKey = 'WalletTransactions';

    /** @deprecated use getLookupAsync instead */
    static getLookup() { return getLookup<WalletTransactionsRow>('WalletTransactions') }
    static async getLookupAsync() { return getLookupAsync<WalletTransactionsRow>('WalletTransactions') }

    static readonly deletePermission = '?';
    static readonly insertPermission = '?';
    static readonly readPermission = '?';
    static readonly updatePermission = '?';

    static readonly Fields = fieldsProxy<WalletTransactionsRow>();
}