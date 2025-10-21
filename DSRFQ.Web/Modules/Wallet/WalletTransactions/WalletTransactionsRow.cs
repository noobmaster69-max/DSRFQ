using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;
using DSRFQ.Modules.Common.Permissions;

namespace DSRFQ.Wallet;

[ConnectionKey("Default"), Module("Wallet"), TableName("WalletTransactions")]
[DisplayName("Wallet Transactions"), InstanceName("Wallet Transactions")]
[NavigationPermission(WalletPermissionKeys.Navigation)]
[ReadPermission("?")]
[DeletePermission("?")]
[UpdatePermission("?")]
[InsertPermission("?")]
[ServiceLookupPermission("?")]
[LookupScript("WalletTransactions",Permission = "?")]
public sealed class WalletTransactionsRow : LoggingRow<WalletTransactionsRow.RowFields>, IIdRow, INameRow
{
    const string jCompany = nameof(jCompany);

    [DisplayName("Id"), Column("ID"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("User Id"), NotNull]
    public int? UserId { get => fields.UserId[this]; set => fields.UserId[this] = value; }

    [DisplayName("Company"), Column("CompanyID"), ForeignKey(typeof(Company.CompaniesRow)), LeftJoin(jCompany)]
    [TextualField(nameof(CompanyName)), LookupEditor(typeof(Company.CompaniesRow), Async = true)]
    public int? CompanyId { get => fields.CompanyId[this]; set => fields.CompanyId[this] = value; }

    [DisplayName("Stripe Session Id"), Size(500), QuickSearch, NameProperty]
    public string StripeSessionId { get => fields.StripeSessionId[this]; set => fields.StripeSessionId[this] = value; }

    [DisplayName("Stripe Payment Intent Id"), Size(500)]
    public string StripePaymentIntentId { get => fields.StripePaymentIntentId[this]; set => fields.StripePaymentIntentId[this] = value; }

    [DisplayName("Stripe Invoice Id"), Size(500)]
    public string StripeInvoiceId { get => fields.StripeInvoiceId[this]; set => fields.StripeInvoiceId[this] = value; }

    [DisplayName("Stripe Invoice Url")]
    public string StripeInvoiceUrl { get => fields.StripeInvoiceUrl[this]; set => fields.StripeInvoiceUrl[this] = value; }
    
    [DisplayName("Amount"), Size(20), Scale(2)]
    public decimal? Amount { get => fields.Amount[this]; set => fields.Amount[this] = value; }

    [DisplayName("Currency")]
    public string Currency { get => fields.Currency[this]; set => fields.Currency[this] = value; }

    [DisplayName("Status"), Size(100)]
    public string Status { get => fields.Status[this]; set => fields.Status[this] = value; }

    [DisplayName("Payment Status"), Size(100)]
    public string PaymentStatus { get => fields.PaymentStatus[this]; set => fields.PaymentStatus[this] = value; }

    [DisplayName("Customer Name")]
    public string CustomerName { get => fields.CustomerName[this]; set => fields.CustomerName[this] = value; }

    [DisplayName("Customer Email")]
    public string CustomerEmail { get => fields.CustomerEmail[this]; set => fields.CustomerEmail[this] = value; }

    
    [DisplayName("Company Name"), Origin(jCompany, nameof(Company.CompaniesRow.Name))]
    public string CompanyName { get => fields.CompanyName[this]; set => fields.CompanyName[this] = value; }

    public class RowFields : LoggingRowFields
    {
        public Int32Field Id;
        public Int32Field UserId;
        public Int32Field CompanyId;
        public StringField StripeSessionId;
        public StringField StripePaymentIntentId;
        public StringField StripeInvoiceId;
        public StringField StripeInvoiceUrl;
        public DecimalField Amount;
        public StringField Currency;
        public StringField Status;
        public StringField PaymentStatus;
        public StringField CustomerName;
        public StringField CustomerEmail;
        

        public StringField CompanyName;
    }
}