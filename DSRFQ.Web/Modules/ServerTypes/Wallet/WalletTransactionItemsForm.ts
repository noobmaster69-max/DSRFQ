import { ServiceLookupEditor, StringEditor, DecimalEditor, PrefixedContext, initFormType } from "@serenity-is/corelib";

export interface WalletTransactionItemsForm {
    WalletTransactionId: ServiceLookupEditor;
    ItemId: StringEditor;
    Description: StringEditor;
    ProductId: StringEditor;
    PriceId: StringEditor;
    AmountDiscount: DecimalEditor;
    AmountSubtotal: DecimalEditor;
    AmountTax: DecimalEditor;
    AmountTotal: DecimalEditor;
    Quantity: DecimalEditor;
    Currency: StringEditor;
}

export class WalletTransactionItemsForm extends PrefixedContext {
    static readonly formKey = 'Wallet.WalletTransactionItems';
    private static init: boolean;

    constructor(prefix: string) {
        super(prefix);

        if (!WalletTransactionItemsForm.init)  {
            WalletTransactionItemsForm.init = true;

            var w0 = ServiceLookupEditor;
            var w1 = StringEditor;
            var w2 = DecimalEditor;

            initFormType(WalletTransactionItemsForm, [
                'WalletTransactionId', w0,
                'ItemId', w1,
                'Description', w1,
                'ProductId', w1,
                'PriceId', w1,
                'AmountDiscount', w2,
                'AmountSubtotal', w2,
                'AmountTax', w2,
                'AmountTotal', w2,
                'Quantity', w2,
                'Currency', w1
            ]);
        }
    }
}