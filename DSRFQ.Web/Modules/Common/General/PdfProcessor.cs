using System.IO;
using DSRFQ.Costing;
using ImageMagick;
using Serenity.Abstractions;
using Serenity.IO;

namespace DSRFQ.Modules.Common.General;

public interface IPdfProcessor
{
    void ProcessPdfToImages(IUnitOfWork uow,string temporaryPdfPath,string pdfPath, int documentId);
}

public class PdfProcessor : IPdfProcessor
{
    
    protected IUserAccessor UserAccessor { get; }
    public int userId { get; }
    public PdfProcessor(IUserAccessor userAccessor)
    {
        UserAccessor = userAccessor ?? throw new ArgumentNullException(nameof(userAccessor));
        userId = Convert.ToInt32(UserAccessor.User.GetIdentifier(), CultureInfo.InvariantCulture);
    }
    public void ProcessPdfToImages(IUnitOfWork uow,string temporaryPdfPath,string pdfPath, int documentId)
    {
        using (var images = new MagickImageCollection())
        {
            var fullPath = Path.Combine(Directory.GetCurrentDirectory(), "App_Data\\upload",temporaryPdfPath);
            
            images.Read(fullPath);
            
            var parentDirectory = string.Join("\\", pdfPath.Split('/').SkipLast(1)) + "\\";
            string outputDir = Path.Combine("App_Data\\upload", parentDirectory, "Image");
            Directory.CreateDirectory(outputDir);

            string fileNameOnly = Path.GetFileNameWithoutExtension(pdfPath);
            int pageNumber = 1;

            foreach (var image in images)
            {
                image.BackgroundColor = MagickColors.White;
                image.Alpha(AlphaOption.Remove);
                image.Format = MagickFormat.Png;

                string fileName = $"{fileNameOnly}_Page_{pageNumber}.png";
                string filePath = Path.Combine(Directory.GetCurrentDirectory(),outputDir, fileName);
                
                image.Write(filePath);

                var inputToDb = parentDirectory.Replace("\\", "/") + "Image/" + fileName;
                uow.Connection.Insert(new CostingPartDocumentImagesRow
                {
                    CostingPartDocumentId = documentId,
                    FileDirectory = inputToDb,
                    FileName = fileName,
                    Page= pageNumber,
                    InsertDate = DateTime.Now,
                    InsertUserId = userId,
                    IsActive = 1,
                    Original = true
                });

                pageNumber++;
            }
            
            
        }
    }
}