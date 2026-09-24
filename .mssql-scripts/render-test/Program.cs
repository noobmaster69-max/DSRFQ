using System.Diagnostics;
using System.Reflection;
using System.Runtime.Loader;
using ImageMagick;

// DSRFQ.Web.dll's own dependencies (Serenity etc.) resolve from its bin folder.
var bin = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, @"..\..\..\..\..\DSRFQ.Web\bin\Debug\net8.0"));
AssemblyLoadContext.Default.Resolving += (_, name) =>
{
    var p = Path.Combine(bin, name.Name + ".dll");
    return File.Exists(p) ? AssemblyLoadContext.Default.LoadFromAssemblyPath(p) : null;
};

var outRoot = Path.Combine(Path.GetTempPath(), "dsrfq-render-test");
if (Directory.Exists(outRoot)) Directory.Delete(outRoot, true);

int fails = 0;
void Check(string name, bool ok, string detail = "")
{
    Console.WriteLine($"  {(ok ? "PASS" : "FAIL")}  {name}{(detail != "" ? "  " + detail : "")}");
    if (!ok) fails++;
}

foreach (var pdf in args)
{
    Console.WriteLine($"\n{Path.GetFileName(pdf)}");
    var outDir = Path.Combine(outRoot, Path.GetFileNameWithoutExtension(pdf));
    var sizes = MagickImageInfo.ReadCollection(pdf).Select(i => (w: (double)i.Width, h: (double)i.Height)).ToList();

    Process.GetCurrentProcess().Refresh();
    var sw = Stopwatch.StartNew();
    var names = Render(pdf, outDir);
    sw.Stop();
    long peakMb = Process.GetCurrentProcess().PeakWorkingSet64 / (1024 * 1024);

    Check("one PNG per page", names.Count == sizes.Count, $"{names.Count} of {sizes.Count}");
    for (int i = 0; i < names.Count; i++)
    {
        var f = Path.Combine(outDir, names[i]);
        var info = new MagickImageInfo(f);
        double dpi = info.Width / (sizes[i].w / 72.0);
        double aspectPdf = sizes[i].w / sizes[i].h, aspectImg = (double)info.Width / info.Height;
        Console.WriteLine($"    {names[i]}: {info.Width} x {info.Height} px  = {dpi:0} dpi  {new FileInfo(f).Length / 1024} KB  (page {sizes[i].w / 72:0.#} x {sizes[i].h / 72:0.#} in)");
        Check($"  page {i + 1}: between 100 and 200 dpi, longest side <= 5000",
            dpi >= 100 && dpi <= 200.5 && Math.Max(info.Width, info.Height) <= 5000 + 1, $"{dpi:0} dpi");
        Check($"  page {i + 1}: same shape as the PDF page (balloon % stay valid)",
            Math.Abs(aspectPdf - aspectImg) < 0.01 * aspectPdf, $"{aspectPdf:0.000} vs {aspectImg:0.000}");
        Check($"  page {i + 1}: sharper than the old 72 dpi image", dpi > 100);
    }
    Console.WriteLine($"    rendered in {sw.Elapsed.TotalSeconds:0.0} s, peak memory {peakMb} MB");
}
Console.WriteLine($"\n{(fails == 0 ? "ALL PASS" : fails + " FAILED")}  (images in {outRoot})");
return fails == 0 ? 0 : 1;

// Its own method, never inlined: DSRFQ.Web.dll is resolved when this is
// compiled, which must be after the Resolving hook above is in place.
[System.Runtime.CompilerServices.MethodImpl(System.Runtime.CompilerServices.MethodImplOptions.NoInlining)]
static List<string> Render(string pdf, string outDir) =>
    DSRFQ.Modules.Common.General.PdfProcessor.RenderPages(pdf, outDir, "page");
