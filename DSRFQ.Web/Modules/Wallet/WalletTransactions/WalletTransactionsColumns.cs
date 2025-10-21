using Serenity.ComponentModel;
using System;
using System.ComponentModel;

namespace DSRFQ.Wallet.Columns;

[ColumnsScript("Wallet.WalletTransactions")]
[BasedOnRow(typeof(WalletTransactionsRow), CheckNames = true)]
public class WalletTransactionsColumns
{
    [EditLink, DisplayName("Db.Shared.RecordId"), AlignRight]
    public int Id { get; set; }
    public int UserId { get; set; }
    public string CompanyName { get; set; }
    [EditLink]
    public string StripeSessionId { get; set; }
    public string StripePaymentIntentId { get; set; }
    public string StripeInvoiceId { get; set; }
    public string StripeInvoiceUrl { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; }
    public string Status { get; set; }
    public string PaymentStatus { get; set; }
    public string CustomerName { get; set; }
    public string CustomerEmail { get; set; }
    public DateTime InsertDate { get; set; }
    public string InsertBy { get; set; }
    public DateTime UpdateDate { get; set; }
    public string UpdateBy { get; set; }
    public DateTime DeleteDate { get; set; }
    public string DeleteBy { get; set; }
}