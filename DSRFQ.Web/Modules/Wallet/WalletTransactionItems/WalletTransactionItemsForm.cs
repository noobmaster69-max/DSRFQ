using Serenity.ComponentModel;
using System;

namespace DSRFQ.Wallet.Forms;

[FormScript("Wallet.WalletTransactionItems")]
[BasedOnRow(typeof(WalletTransactionItemsRow), CheckNames = true)]
public class WalletTransactionItemsForm
{
    public int WalletTransactionId { get; set; }
    public string ItemId { get; set; }
    public string Description { get; set; }
    public string ProductId { get; set; }
    public string PriceId { get; set; }
    public decimal AmountDiscount { get; set; }
    public decimal AmountSubtotal { get; set; }
    public decimal AmountTax { get; set; }
    public decimal AmountTotal { get; set; }
    public decimal Quantity { get; set; }
    public string Currency { get; set; }
   
}