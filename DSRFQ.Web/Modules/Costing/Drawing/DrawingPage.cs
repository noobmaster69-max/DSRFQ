namespace DSRFQ.Modules.Costing.Drawing.Pages;

[Route("Drawing/[action]")]
public class DrawingPage : Controller
{   
        
    
    [PageAuthorize, HttpGet, Route("~/DrawingLibrary")]
    public ActionResult DrawingLibrary()
    {   
        
        return View(MVC.Views.Costing.Drawing.DrawingIndex, null);
    }
    
        
}