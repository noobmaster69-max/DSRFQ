using Serenity.ComponentModel;
using System;
using System.ComponentModel;

namespace DSRFQ.Wallet.Columns;

[ColumnsScript("Wallet.WalletTransactionItems")]
[BasedOnRow(typeof(WalletTransactionItemsRow), CheckNames = true)]
public class WalletTransactionItemsColumns
{
    [EditLink, DisplayName("Db.Shared.RecordId"), AlignRight]
    public int Id { get; set; }
    public string WalletTransactionStripeSessionId { get; set; }
    [EditLink]
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
    public DateTime InsertDate { get; set; }
    public string InsertBy { get; set; }
    public DateTime UpdateDate { get; set; }
    public string UpdateBy { get; set; }
    public DateTime DeleteDate { get; set; }
    public string DeleteBy { get; set; }
}