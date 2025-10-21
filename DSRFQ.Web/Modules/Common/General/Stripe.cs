using Microsoft.Extensions.Configuration;

using Stripe;
using Stripe.Checkout;

namespace DSRFQ.Modules.Common.General;
[ConnectionKey("Default"), ServiceAuthorize("*")]
[ApiController]

public class StripeController : Controller
{
    private readonly IConfiguration _configuration;

    // Use dependency injection to get configuration settings
    public StripeController(IConfiguration configuration)
    {
        _configuration = configuration;
        StripeConfiguration.ApiKey = _configuration["Stripe:SecretKey"];
    }
    [HttpPost]
    [Route("create-checkout-session")]

    public ActionResult Create()
    {
        var request = HttpContext.Request;
        var baseUrl = $"{request.Scheme}://{request.Host}";
        var returnUrl = $"{baseUrl}/CheckoutReturn?session_id={{CHECKOUT_SESSION_ID}}";
        var options = new SessionCreateOptions
        {
            UiMode = "embedded",
            SubmitType = "pay",
            // CustomerEmail = "customer@example.com",
            //
            // BillingAddressCollection = "auto",
            // ShippingAddressCollection = new SessionShippingAddressCollectionOptions
            // {
            //     AllowedCountries = new List<string>
            //     {
            //         "US",
            //         "CA",
            //     },
            // },
            InvoiceCreation = new SessionInvoiceCreationOptions
            {
                Enabled = true,
            },
            LineItems = new List<SessionLineItemOptions>
            {
                new SessionLineItemOptions
                {
                    Price = "price_1Ry5YvLSIf0mjgrcIklkp9Jv",
                    Quantity = 1,
                },
            },
            Mode = "payment",
            ReturnUrl = returnUrl
        };
        var service = new SessionService();
        Session session = service.Create(options);

        return Json(new {clientSecret = session.ClientSecret});
    }
    public class Model
    {
        public string session_id { get; set; }
       
    }
    [HttpPost, Route("~/Billing/GetInvoiceUrl")]
    public ActionResult GetInvoiceUrl([FromBody] Model model)
    {
        string session_id = model.session_id;
        
        var service = new SessionService();
        var session = service.Get(session_id);
            
        if (session == null || string.IsNullOrEmpty(session.InvoiceId))
        {
            return Json(new { success = false, message = "Invoice not available yet." });
        }

        var invoiceService = new InvoiceService();
        var invoice = invoiceService.Get(session.InvoiceId);

        if (invoice == null || string.IsNullOrEmpty(invoice.HostedInvoiceUrl))
        {
            return Json(new { success = false, message = "Invoice not ready." });
        }

        return Json(new { success = true, url = invoice.HostedInvoiceUrl,invoice_id = session.InvoiceId });
    }
    
}
public class StripeOptions
{
    public string option { get; set; }
}
[ConnectionKey("Default"), ServiceAuthorize("*")]

[ApiController]
public class SessionStatusController : Controller
{
    [HttpGet,Route("session-status")]
    public ActionResult SessionStatus([FromQuery] string session_id)
    {
        var sessionService = new SessionService();
        // var options = new SessionGetOptions();
        // options.AddExpand("payment_intent");
        // Session session = sessionService.Get(session_id, options);
        Session session = sessionService.Get(session_id);

        return Json(new {status = session.Status, payment_status = session.PaymentStatus, payment_intent_id = session.PaymentIntent.Id, payment_intent_status = session.PaymentIntent.Status});
    }
}