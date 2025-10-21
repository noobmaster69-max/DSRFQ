using DSRFQ.Modules.Common.General;
using Serenity.Services;
using MyRequest = Serenity.Services.SaveRequest<DSRFQ.Costing.CostingPartDocumentsRow>;
using MyResponse = Serenity.Services.SaveResponse;
using MyRow = DSRFQ.Costing.CostingPartDocumentsRow;

namespace DSRFQ.Costing;

public interface ICostingPartDocumentsSaveHandler : ISaveHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartDocumentsSaveHandler : SaveRequestHandler<MyRow, MyRequest, MyResponse>, ICostingPartDocumentsSaveHandler
{
    protected IUserAccessor UserAccessor { get; }
    private readonly IPdfProcessor _pdfProcessor;
    protected string temporaryFilePath ;
    public CostingPartDocumentsSaveHandler(IRequestContext context,IPdfProcessor pdfProcessor)
            : base(context)
    {
        _pdfProcessor = pdfProcessor;
    }

    protected override void BeforeSave()
    {
        base.BeforeSave();
        this.temporaryFilePath = Row.FileDirectory;
    }


    protected override void AfterSave()
    {
        base.AfterSave();
        
        
        if (IsCreate)
        {
            var row = Row;
            if (row.FileDirectory != null && row.FileDirectory.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            {
                
                _pdfProcessor.ProcessPdfToImages(this.UnitOfWork,temporaryFilePath,row.FileDirectory, row.Id.Value);
            }
        }
        
    }
}