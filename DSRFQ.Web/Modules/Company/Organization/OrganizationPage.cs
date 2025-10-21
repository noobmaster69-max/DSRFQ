namespace DSRFQ.Modules.Company.Organization.Pages;

[Route("Organization/[action]")]
public class OrganizationPage : Controller
{   
        
    
    [PageAuthorize, HttpGet, Route("~/OrganizationDetail")]
    public ActionResult OrganizationDetail()
    {   
        
        return View(MVC.Views.Company.Organization.OrganizationDetailIndex, null);
    }
    
        
}