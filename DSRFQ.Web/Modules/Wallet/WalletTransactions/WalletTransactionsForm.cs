using Serenity.ComponentModel;
using System;

namespace DSRFQ.Wallet.Forms;

[FormScript("Wallet.WalletTransactions")]
[BasedOnRow(typeof(WalletTransactionsRow), CheckNames = true)]
public class WalletTransactionsForm
{
    public int UserId { get; set; }
    public int CompanyId { get; set; }
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
  
}