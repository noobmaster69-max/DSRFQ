using System.IO;

namespace DSRFQ.Modules.Common.General;
using ImageMagick;

[ConnectionKey("Default"), ServiceAuthorize("*")]

public class GeneralFunction : ServiceEndpoint{

    protected IUserAccessor UserAccessor { get; }
    protected IFileSystem FileSystem { get; }
    public int userId { get; }

    public GeneralFunction(IUserAccessor userAccessor,IFileSystem fileSystem)
    {
        FileSystem = fileSystem;
        UserAccessor = userAccessor ?? throw new ArgumentNullException(nameof(userAccessor));
        userId = Convert.ToInt32(UserAccessor.User.GetIdentifier(), CultureInfo.InvariantCulture);

    }
    public void ProcessPdfToImages(string pdfPath, int documentId)
    {
        using (var images = new MagickImageCollection())
        {
            var fullPath = FileSystem.GetFullPath(pdfPath);
            images.Read(fullPath);
            var parentDirectory = string.Join("/", pdfPath.Split('/')
                .SkipLast(1)) + "/";;
            string outputDir = Path.Combine("App_Data", parentDirectory, "Image");
            Directory.CreateDirectory(outputDir);
            string fileNameOnly = Path.GetFileNameWithoutExtension(pdfPath);
            int pageNumber = 1;
            foreach (var image in images)
            {
                // convert each page to PNG (or JPG)
                image.Format = MagickFormat.Png;
                

                string fileName = $"{fileNameOnly}_Page_{pageNumber}.png";
                string filePath = Path.Combine(outputDir, fileName);

                image.Write(filePath);

                // Save record into PdfPages table
                // using (var connection = SqlConnections.NewByKey("Default"))
                // {
                //     connection.Execute(
                //         "INSERT INTO PdfPages (DocumentId, PageNumber, FilePath) VALUES (@docId, @page, @path)",
                //         new { docId = documentId, page = pageNumber, path = filePath }
                //     );
                // }

                pageNumber++;
            }
        }
    }

}