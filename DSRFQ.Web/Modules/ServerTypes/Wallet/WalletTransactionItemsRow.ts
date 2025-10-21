import { getLookup, getLookupAsync, fieldsProxy } from "@serenity-is/corelib";

export interface WalletTransactionItemsRow {
    Id?: number;
    WalletTransactionId?: number;
    ItemId?: string;
    Description?: string;
    ProductId?: string;
    PriceId?: string;
    AmountDiscount?: number;
    AmountSubtotal?: number;
    AmountTax?: number;
    AmountTotal?: number;
    Quantity?: number;
    Currency?: string;
    WalletTransactionStripeSessionId?: string;
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

export abstract class WalletTransactionItemsRow {
    static readonly idProperty = 'Id';
    static readonly isActiveProperty = 'IsActive';
    static readonly nameProperty = 'ItemId';
    static readonly localTextPrefix = 'Wallet.WalletTransactionItems';
    static readonly lookupKey = 'WalletTransactionItems';

    /** @deprecated use getLookupAsync instead */
    static getLookup() { return getLookup<WalletTransactionItemsRow>('WalletTransactionItems') }
    static async getLookupAsync() { return getLookupAsync<WalletTransactionItemsRow>('WalletTransactionItems') }

    static readonly deletePermission = '?';
    static readonly insertPermission = '?';
    static readonly readPermission = '?';
    static readonly updatePermission = '?';

    static readonly Fields = fieldsProxy<WalletTransactionItemsRow>();
}