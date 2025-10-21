namespace DSRFQ.Common;

public class BillingHistoryModel
{
    public decimal Amount { get; set; }
    public string Currency { get; set; }
    public string SessionId { get; set; }
    public string PaymentStatus { get; set; }
    public string CustomerName { get; set; }
    public string CustomerEmail { get; set; }
    public string InsertBy { get; set; }
    public string InsertDate { get; set; }
    public string Description { get; set; }

}