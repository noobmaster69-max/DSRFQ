using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;
using DSRFQ.Modules.Common.Permissions;

namespace DSRFQ.Wallet;

[ConnectionKey("Default"), Module("Wallet"), TableName("WalletTransactionItems")]
[DisplayName("Wallet Transaction Items"), InstanceName("Wallet Transaction Items")]
[NavigationPermission(WalletPermissionKeys.Navigation)]
[ReadPermission("?")]
[DeletePermission("?")]
[UpdatePermission("?")]
[InsertPermission("?")]
[ServiceLookupPermission("?")]
[LookupScript("WalletTransactionItems",Permission = "?")]
public sealed class WalletTransactionItemsRow : LoggingRow<WalletTransactionItemsRow.RowFields>, IIdRow, INameRow
{
    const string jWalletTransaction = nameof(jWalletTransaction);

    [DisplayName("Id"), Column("ID"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Wallet Transaction"), Column("WalletTransactionID"), NotNull, ForeignKey(typeof(WalletTransactionsRow))]
    [LeftJoin(jWalletTransaction), TextualField(nameof(WalletTransactionStripeSessionId))]
    [ServiceLookupEditor(typeof(WalletTransactionsRow))]
    public int? WalletTransactionId { get => fields.WalletTransactionId[this]; set => fields.WalletTransactionId[this] = value; }

    [DisplayName("Item Id"), QuickSearch, NameProperty]
    public string ItemId { get => fields.ItemId[this]; set => fields.ItemId[this] = value; }

    [DisplayName("Description")]
    public string Description { get => fields.Description[this]; set => fields.Description[this] = value; }

    [DisplayName("Product Id")]
    public string ProductId { get => fields.ProductId[this]; set => fields.ProductId[this] = value; }

    [DisplayName("Price Id")]
    public string PriceId { get => fields.PriceId[this]; set => fields.PriceId[this] = value; }

    [DisplayName("Amount Discount"), Size(20), Scale(2), NotNull]
    public decimal? AmountDiscount { get => fields.AmountDiscount[this]; set => fields.AmountDiscount[this] = value; }

    [DisplayName("Amount Subtotal"), Size(20), Scale(2), NotNull]
    public decimal? AmountSubtotal { get => fields.AmountSubtotal[this]; set => fields.AmountSubtotal[this] = value; }

    [DisplayName("Amount Tax"), Size(20), Scale(2), NotNull]
    public decimal? AmountTax { get => fields.AmountTax[this]; set => fields.AmountTax[this] = value; }

    [DisplayName("Amount Total"), Size(20), Scale(2), NotNull]
    public decimal? AmountTotal { get => fields.AmountTotal[this]; set => fields.AmountTotal[this] = value; }

    [DisplayName("Quantity"), Size(20), Scale(2)]
    public decimal? Quantity { get => fields.Quantity[this]; set => fields.Quantity[this] = value; }

    [DisplayName("Currency"), Size(100)]
    public string Currency { get => fields.Currency[this]; set => fields.Currency[this] = value; }

    

    [DisplayName("Wallet Transaction Stripe Session Id"), Origin(jWalletTransaction, nameof(WalletTransactionsRow.StripeSessionId))]
    public string WalletTransactionStripeSessionId { get => fields.WalletTransactionStripeSessionId[this]; set => fields.WalletTransactionStripeSessionId[this] = value; }

    public class RowFields : LoggingRowFields
    {
        public Int32Field Id;
        public Int32Field WalletTransactionId;
        public StringField ItemId;
        public StringField Description;
        public StringField ProductId;
        public StringField PriceId;
        public DecimalField AmountDiscount;
        public DecimalField AmountSubtotal;
        public DecimalField AmountTax;
        public DecimalField AmountTotal;
        public DecimalField Quantity;
        public StringField Currency;
    

        public StringField WalletTransactionStripeSessionId;
    }
}