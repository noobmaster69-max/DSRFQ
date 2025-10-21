using DSRFQ.AppServices;
using DSRFQ.Wallet;
using Microsoft.Extensions.Configuration;
using Stripe;
using Stripe.Checkout;


namespace DSRFQ.Modules.Company.Billing.Pages;

[Route("Billing/[action]")]
public class BillingPage : Controller
{   
        
    private readonly IConfiguration _configuration;
    protected IUserAccessor UserAccessor { get; }
    protected ISqlConnections SqlConnections { get; }
    
    public int userId { get; }
    public BillingPage(IConfiguration configuration,IUserAccessor userAccessor,ISqlConnections sqlConnections)
    {
        _configuration = configuration;
        StripeConfiguration.ApiKey = _configuration["Stripe:SecretKey"];
        UserAccessor = userAccessor ?? throw new ArgumentNullException(nameof(userAccessor));
        userId = Convert.ToInt32(UserAccessor.User.GetIdentifier(), CultureInfo.InvariantCulture);
        SqlConnections = sqlConnections ?? throw new ArgumentNullException(nameof(sqlConnections));

    }
    [PageAuthorize, HttpGet, Route("~/Billing")]
    public ActionResult Billing()
    {   
       
        return View(MVC.Views.Company.Billing.BillingIndex, null);
    }
    [PageAuthorize, HttpGet, Route("~/Checkout")]
    public ActionResult CheckOut()
    {   
        
        return View(MVC.Views.Company.Billing.CheckoutIndex, null);
    }
    [PageAuthorize, HttpGet, Route("~/CheckoutReturn")]
    public ActionResult CheckOutReturn([FromQuery] string session_id)
    {   
        var options = new SessionGetOptions {
            Expand = new List<string> { "line_items" },
        };
       
        var service = new SessionService();
        var checkoutSession = service.Get(session_id, options);

        // Basic validation
        if (checkoutSession == null || checkoutSession.PaymentStatus != "paid" || checkoutSession.Status != "complete")
        {
            return View(MVC.Views.Company.Billing.BillingIndex, new { success = false, message = "Payment not completed" });
        }

        // Extract details
        var userEmail = checkoutSession.CustomerDetails?.Email;
        var stripeCustomerId = checkoutSession.CustomerId;
        var stripeSessionId = checkoutSession.Id;
        var stripePaymentIntentId = checkoutSession.PaymentIntentId;
        var stripeInvoiceId = checkoutSession.InvoiceId;
        var amount = checkoutSession.AmountTotal.HasValue ? checkoutSession.AmountTotal.Value / 100m : 0m; // cents → dollars
        var currency = checkoutSession.Currency.ToUpper();

        
        using (var connection = SqlConnections.NewFor<WalletTransactionsRow>())
        using (var uow = new UnitOfWork(connection))
        {
            var walletTransactionField = WalletTransactionsRow.Fields;
            var walletTransactionRow = connection.TryFirst<WalletTransactionsRow>(q => q
                .Select(walletTransactionField.Id)
                .Where(walletTransactionField.StripeSessionId==stripeSessionId).Where(walletTransactionField.IsActive==1)
            );
            if (walletTransactionRow!=null)
            {
                return View(MVC.Views.Company.Billing.BillingIndex, new { success = false, message = "Record already existed." });

            }
            
            var transaction = new WalletTransactionsRow
            {
                UserId = userId,
                CompanyId = UserAccessor.User.GetCompanyId(),
                StripeSessionId = stripeSessionId,
                StripePaymentIntentId = stripePaymentIntentId,
                
                Amount = amount,
                Currency = currency,
                Status = checkoutSession.Status,
                PaymentStatus = checkoutSession.PaymentStatus,
                CustomerName = checkoutSession.CustomerDetails.Name,
                CustomerEmail = checkoutSession.CustomerDetails.Email,
                InsertUserId = userId,
                InsertDate = DateTime.Now,
                IsActive = 1
                
            };
            var walletTransactionId =uow.Connection.InsertAndGetID(transaction);
            
            foreach (var item in checkoutSession.LineItems)
            {
                var transactionItem = new WalletTransactionItemsRow
                {
                    WalletTransactionId = Convert.ToInt32(walletTransactionId),
                    ItemId = item.Id,
                    Description = item.Description,
                    ProductId = item.Price.ProductId,
                    PriceId = item.Price.Id,
                    AmountDiscount = item.AmountDiscount/ 100m,
                    AmountSubtotal = item.AmountSubtotal/ 100m,
                    AmountTax = item.AmountTax/ 100m,
                    AmountTotal = item.AmountTotal/ 100m,
                    Quantity = item.Quantity,
                    Currency = item.Price.Currency,
                   
                    InsertUserId = userId,
                    InsertDate = DateTime.Now,
                    IsActive = 1
                
                };
                uow.Connection.Insert(transactionItem);
                
            }
            uow.Commit();
        }

        return View(MVC.Views.Company.Billing.BillingIndex, new { success = true, message = "Payment successful" });
        
        

    } 
}