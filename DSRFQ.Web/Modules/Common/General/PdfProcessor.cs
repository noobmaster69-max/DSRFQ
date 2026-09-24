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
    /// <summary>Page images are rendered at this density...</summary>
    public const double PageDpi = 200;
    /// <summary>...unless that would make the longest side longer than this.</summary>
    public const int MaxPageSide = 5000;

    /// <summary>
    /// The density to render one page at: <see cref="PageDpi"/>, lowered just
    /// enough to keep the longest side within <see cref="MaxPageSide"/>.
    /// </summary>
    /// <remarks>
    /// These are the images the editor shows and balloons are drawn on. They
    /// used to be read at ImageMagick's default of 72 dpi, so small tolerances
    /// blurred as soon as anyone zoomed in, and the dimension crops in the
    /// balloon list and the Area / Single Read boxes were cut from that blur.
    ///
    /// 200 dpi on an A4/A3 sheet; the cap brings a 34 x 22 in sheet to ~147 dpi
    /// and an A0 to ~107 dpi, where 200 would be 62 megapixels a page - more
    /// than a browser canvas handles comfortably, and gigabytes to rasterise.
    ///
    /// Nothing downstream assumes 72 dpi: balloon positions are percentages of
    /// the page, and the consumer and the RPA API scale by the image's actual
    /// size against the PDF page.
    /// </remarks>
    public static double DensityFor(double widthPt, double heightPt)
    {
        var longest = Math.Max(widthPt, heightPt);
        if (longest <= 0) return PageDpi;
        return Math.Min(PageDpi, MaxPageSide * 72.0 / longest);
    }

    /// <summary>
    /// Render every page of a PDF to PNG in <paramref name="outputDir"/>, named
    /// {fileNameOnly}_Page_{n}.png. Returns the file names in page order.
    /// </summary>
    /// <remarks>
    /// Kept apart from the database insert so it can be exercised on a real
    /// drawing without uploading one.
    /// </remarks>
    public static List<string> RenderPages(string pdfFullPath, string outputDir, string fileNameOnly)
    {
        Directory.CreateDirectory(outputDir);

        // Page sizes first, at the default 72 dpi, where one pixel is one PDF
        // point - cheap, and it gives each page its own density below.
        var pages = MagickImageInfo.ReadCollection(pdfFullPath).ToList();
        var names = new List<string>();

        // One page at a time. Reading the whole document at 200 dpi in one
        // collection held every page's pixels at once (16-bit RGBA: 8 bytes a
        // pixel), which for a multi-sheet A1 drawing is gigabytes in the web
        // server's own process.
        for (int i = 0; i < pages.Count; i++)
        {
            var settings = new MagickReadSettings
            {
                Density = new Density(DensityFor(pages[i].Width, pages[i].Height)),
                FrameIndex = (uint)i,
                FrameCount = 1,
            };

            using var image = new MagickImage(pdfFullPath, settings);
            image.BackgroundColor = MagickColors.White;
            image.Alpha(AlphaOption.Remove);
            image.Format = MagickFormat.Png;

            string fileName = $"{fileNameOnly}_Page_{i + 1}.png";
            image.Write(Path.Combine(outputDir, fileName));
            names.Add(fileName);
        }
        return names;
    }

    public void ProcessPdfToImages(IUnitOfWork uow,string temporaryPdfPath,string pdfPath, int documentId)
    {
        var fullPath = Path.Combine(Directory.GetCurrentDirectory(), "App_Data\\upload",temporaryPdfPath);

        var parentDirectory = string.Join("\\", pdfPath.Split('/').SkipLast(1)) + "\\";
        string outputDir = Path.Combine(Directory.GetCurrentDirectory(), "App_Data\\upload", parentDirectory, "Image");
        string fileNameOnly = Path.GetFileNameWithoutExtension(pdfPath);

        var fileNames = RenderPages(fullPath, outputDir, fileNameOnly);
        for (int i = 0; i < fileNames.Count; i++)
        {
            int pageNumber = i + 1;
            string fileName = fileNames[i];
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
        }
    }
}