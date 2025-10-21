import { IntegerEditor, LookupEditor, StringEditor, DecimalEditor, PrefixedContext, initFormType } from "@serenity-is/corelib";

export interface WalletTransactionsForm {
    UserId: IntegerEditor;
    CompanyId: LookupEditor;
    StripeSessionId: StringEditor;
    StripePaymentIntentId: StringEditor;
    StripeInvoiceId: StringEditor;
    StripeInvoiceUrl: StringEditor;
    Amount: DecimalEditor;
    Currency: StringEditor;
    Status: StringEditor;
    PaymentStatus: StringEditor;
    CustomerName: StringEditor;
    CustomerEmail: StringEditor;
}

export class WalletTransactionsForm extends PrefixedContext {
    static readonly formKey = 'Wallet.WalletTransactions';
    private static init: boolean;

    constructor(prefix: string) {
        super(prefix);

        if (!WalletTransactionsForm.init)  {
            WalletTransactionsForm.init = true;

            var w0 = IntegerEditor;
            var w1 = LookupEditor;
            var w2 = StringEditor;
            var w3 = DecimalEditor;

            initFormType(WalletTransactionsForm, [
                'UserId', w0,
                'CompanyId', w1,
                'StripeSessionId', w2,
                'StripePaymentIntentId', w2,
                'StripeInvoiceId', w2,
                'StripeInvoiceUrl', w2,
                'Amount', w3,
                'Currency', w2,
                'Status', w2,
                'PaymentStatus', w2,
                'CustomerName', w2,
                'CustomerEmail', w2
            ]);
        }
    }
}