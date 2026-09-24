using ImageMagick;
using Microsoft.Extensions.Configuration;
using Serenity;
using Serenity.Data;
using Serenity.Services;
using System;
using System.Collections.Generic;
using System.Data;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace DSRFQ.Costing;

public class RecognizeRegionRequest : ServiceRequest
{
    public int CostingPartId { get; set; }
    /// <summary>The page image as the widget loads it: "Drawing/12/Image/x_Page_1.png".</summary>
    public string PageImage { get; set; }
    /// <summary>"area" - every text its own balloon; "single" - one balloon for the lot.</summary>
    public string Mode { get; set; }
    /// <summary>The dragged rectangle, percent of page, top-left origin.</summary>
    public decimal X { get; set; }
    public decimal Y { get; set; }
    public decimal Width { get; set; }
    public decimal Height { get; set; }
}

public class RecognizedBalloon
{
    public string Symbol { get; set; }
    public string OriginalSymbol { get; set; }
    public int? Quantity { get; set; }
    public string UpperTol { get; set; }
    public string LowerTol { get; set; }
    public bool IsNote { get; set; }
    /// <summary>Percent of page.</summary>
    public decimal BBoxX1 { get; set; }
    public decimal BBoxY1 { get; set; }
    public decimal BBoxX2 { get; set; }
    public decimal BBoxY2 { get; set; }
    public double Confidence { get; set; }
}

public class RecognizeRegionResponse : ServiceResponse
{
    public string Mode { get; set; }
    public List<RecognizedBalloon> Items { get; set; } = new();
}

/// <summary>
/// One Supply's Area Recognition (W) and Single Recognition (Q), server side.
/// </summary>
/// <remarks>
/// The recognition engine on 5999 is the only service that reads a region:
/// POST /process_document/area or /single with a cropped image, answering in
/// the crop's pixels. RPA/API's ballooning route always runs the whole page and
/// then drops reference and basic dimensions - exactly what an operator who
/// draws a box round one wants kept - so it is not used here.
///
/// The crop is cut from the stored page PNG on the server, the same file the
/// widget shows, so percent coordinates mean the same thing on both sides and
/// no image travels up from the browser. The path the browser names is checked
/// against the part's own document images before it is opened.
///
/// Mirrors the PyQt client: pad the selection a little (the engine reads text
/// that touches the edge badly), offset the results back, and for "single"
/// merge everything read into one balloon in reading order.
/// </remarks>
public static class BalloonRegionRecognizer
{
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(180) };
    private static readonly Regex QuantityPrefix = new(@"^\s*\(?\s*(\d{1,3})\s*\)?\s*[xX×]\s*(.+)$", RegexOptions.Compiled);

    public static RecognizeRegionResponse Recognize(IDbConnection connection, RecognizeRegionRequest request,
        IConfiguration config, string contentRoot)
    {
        if (request is null) throw new ValidationError("Nothing to recognise.");
        var mode = (request.Mode ?? "").Trim().ToLowerInvariant();
        if (mode != "area" && mode != "single")
            throw new ValidationError("Mode must be area or single.");
        if (request.Width <= 0 || request.Height <= 0)
            throw new ValidationError("Draw a box around the text to recognise.");

        var relative = (request.PageImage ?? "").Trim().TrimStart('/');
        if (relative.StartsWith("upload/", StringComparison.OrdinalIgnoreCase)) relative = relative[7..];
        relative = Uri.UnescapeDataString(relative);

        // Only this part's own page images - never an arbitrary path.
        var owned = connection.Query<int>(@"
            SELECT COUNT(1)
            FROM dbo.CostingPartDocumentImages i
            JOIN dbo.CostingPartDocuments d ON d.ID = i.CostingPartDocumentID
            WHERE d.CostingPartID = @part AND i.FileDirectory = @dir
              AND ISNULL(i.IsActive, 1) = 1 AND ISNULL(d.IsActive, 1) = 1",
            new { part = request.CostingPartId, dir = relative }).FirstOrDefault();
        if (owned == 0)
            throw new ValidationError("That page does not belong to this part.");

        var uploadRoot = Path.GetFullPath(Path.Combine(contentRoot, "App_Data", "upload"));
        var fullPath = Path.GetFullPath(Path.Combine(uploadRoot, relative.Replace('/', Path.DirectorySeparatorChar)));
        if (!fullPath.StartsWith(uploadRoot, StringComparison.OrdinalIgnoreCase) || !File.Exists(fullPath))
            throw new ValidationError("The page image could not be found.");

        using var page = new MagickImage(fullPath);
        int pageW = (int)page.Width, pageH = (int)page.Height;

        int x = Clamp((int)Math.Floor(request.X / 100m * pageW), 0, pageW - 1);
        int y = Clamp((int)Math.Floor(request.Y / 100m * pageH), 0, pageH - 1);
        int w = Math.Max(1, (int)Math.Ceiling(request.Width / 100m * pageW));
        int h = Math.Max(1, (int)Math.Ceiling(request.Height / 100m * pageH));
        int pad = Clamp((int)(Math.Min(w, h) * 0.05), 6, 24);
        int cx = Math.Max(0, x - pad), cy = Math.Max(0, y - pad);
        int cw = Math.Min(pageW, x + w + pad) - cx, ch = Math.Min(pageH, y + h + pad) - cy;

        byte[] png;
        using (var crop = page.CloneArea(cx, cy, (uint)cw, (uint)ch))
        {
            crop.Format = MagickFormat.Png;
            png = crop.ToByteArray();
        }

        // The drawing PDF behind this page, for its text layer. With it the
        // engine reads notes (and reads them in order); without it, pixels only.
        var source = FindSourcePdf(connection, request.CostingPartId, relative, uploadRoot);
        var body = source is null ? null
            : RecognizeViaApi(config, mode, png, source.Value.path, source.Value.page, pageW, pageH,
                              (cx, cy, cw, ch), (x, y, Math.Min(w, pageW - x), Math.Min(h, pageH - y)));
        body ??= RecognizeViaEngine(config, mode, png);

        var raw = Parse(body);
        // Crop pixels -> page percent.
        decimal Px(double v) => (decimal)Math.Clamp((v + cx) / pageW * 100, 0, 100);
        decimal Py(double v) => (decimal)Math.Clamp((v + cy) / pageH * 100, 0, 100);

        var items = raw.Select(r => new RecognizedBalloon
        {
            Symbol = r.Text,
            OriginalSymbol = r.Text,
            UpperTol = r.Upper,
            LowerTol = r.Lower,
            IsNote = r.IsNote,
            BBoxX1 = Px(r.X1), BBoxY1 = Py(r.Y1), BBoxX2 = Px(r.X2), BBoxY2 = Py(r.Y2),
            Confidence = r.Score,
        }).ToList();

        if (mode == "single")
            items = MergeSingle(items, request);

        foreach (var item in items)
        {
            var m = QuantityPrefix.Match(item.Symbol ?? "");
            if (m.Success && int.TryParse(m.Groups[1].Value, out var q) && q >= 2)
            {
                item.Quantity = q;
                item.Symbol = m.Groups[2].Value.Trim();
            }
        }

        return new RecognizeRegionResponse { Mode = mode, Items = items };
    }

    private static int Clamp(int v, int lo, int hi) => Math.Max(lo, Math.Min(hi, v));

    /// <summary>
    /// The PDF the page image was rendered from, and its page number. The
    /// as-uploaded file for an Original image, the converted PDF otherwise;
    /// null for a raster upload.
    /// </summary>
    private static (string path, int page)? FindSourcePdf(IDbConnection connection, int partId, string pageImage, string uploadRoot)
    {
        var row = connection.Query<(string File, string Converted, int? Page, bool? Original)>(@"
            SELECT d.FileDirectory, d.ConvertedFileDirectory, i.Page, i.Original
            FROM dbo.CostingPartDocumentImages i
            JOIN dbo.CostingPartDocuments d ON d.ID = i.CostingPartDocumentID
            WHERE d.CostingPartID = @part AND i.FileDirectory = @dir",
            new { part = partId, dir = pageImage }).FirstOrDefault();
        var candidates = row.Original == false
            ? new[] { row.Converted, row.File }
            : new[] { row.File, row.Converted };
        foreach (var c in candidates)
        {
            if (string.IsNullOrWhiteSpace(c) || !c.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase)) continue;
            var full = Path.GetFullPath(Path.Combine(uploadRoot, c.TrimStart('/').Replace('/', Path.DirectorySeparatorChar)));
            if (full.StartsWith(uploadRoot, StringComparison.OrdinalIgnoreCase) && File.Exists(full))
                return (full, Math.Max(1, row.Page ?? 1));
        }
        return null;
    }

    /// <summary>
    /// Through RPA/API's region route, which adds the PDF words inside the box
    /// and rebuilds notes in the PDF's word order. Null when RPA/API cannot be
    /// reached, so recognition still works from pixels alone.
    /// </summary>
    private static string RecognizeViaApi(IConfiguration config, string mode, byte[] png, string pdfPath, int pdfPage,
        int pageW, int pageH, (int x, int y, int w, int h) crop, (int x, int y, int w, int h) selection)
    {
        var api = (config["Ballooning:ApiUrl"] ?? "http://localhost:8000").TrimEnd('/');
        try
        {
            using var form = new MultipartFormDataContent();
            var file = new ByteArrayContent(png);
            file.Headers.ContentType = new MediaTypeHeaderValue("image/png");
            form.Add(file, "file", "crop.png");
            var pdf = new ByteArrayContent(File.ReadAllBytes(pdfPath));
            pdf.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
            form.Add(pdf, "pdf", Path.GetFileName(pdfPath));
            void Field(string name, object value) =>
                form.Add(new StringContent(Convert.ToString(value, CultureInfo.InvariantCulture)), name);
            Field("mode", mode);
            Field("page", pdfPage);
            Field("image_w", pageW); Field("image_h", pageH);
            Field("crop_x", crop.x); Field("crop_y", crop.y); Field("crop_w", crop.w); Field("crop_h", crop.h);
            Field("sel_x", selection.x); Field("sel_y", selection.y); Field("sel_w", selection.w); Field("sel_h", selection.h);

            using var message = new HttpRequestMessage(HttpMethod.Post, $"{api}/api/v1/process/ballooning/region") { Content = form };
            message.Headers.Add("X-API-Key", config["Ballooning:ApiKey"] ?? "");
            using var res = Http.Send(message);
            var body = res.Content.ReadAsStringAsync().GetAwaiter().GetResult();
            if (res.IsSuccessStatusCode) return body;
            // 502 = RPA/API is up but the engine is not; say so rather than retry the same engine.
            if ((int)res.StatusCode == 502)
                throw new ValidationError("The recognition engine is not answering. Start Ballooning Model in the control panel.");
            return null;
        }
        catch (HttpRequestException) { return null; }
        catch (TaskCanceledException)
        {
            throw new ValidationError("Recognition took too long and was stopped.");
        }
    }

    /// <summary>Straight to the engine with the crop alone.</summary>
    private static string RecognizeViaEngine(IConfiguration config, string mode, byte[] png)
    {
        var engine = (config["Ballooning:EngineUrl"] ?? "http://localhost:5999").TrimEnd('/');
        try
        {
            using var form = new MultipartFormDataContent();
            var file = new ByteArrayContent(png);
            file.Headers.ContentType = new MediaTypeHeaderValue("image/png");
            form.Add(file, "file", "crop.png");
            using var res = Http.PostAsync($"{engine}/process_document/{mode}", form).GetAwaiter().GetResult();
            var body = res.Content.ReadAsStringAsync().GetAwaiter().GetResult();
            if (!res.IsSuccessStatusCode)
                throw new ValidationError($"Recognition failed (HTTP {(int)res.StatusCode}).");
            return body;
        }
        catch (HttpRequestException)
        {
            throw new ValidationError($"The recognition engine is not answering at {engine}. Start Ballooning Model in the control panel.");
        }
        catch (TaskCanceledException)
        {
            throw new ValidationError("Recognition took too long and was stopped.");
        }
    }

    private sealed class RawItem
    {
        public string Text = "", Upper, Lower;
        public double X1, Y1, X2, Y2, Score;
        public bool IsNote;
    }

    /// <summary>Both the engine's native shape (views[]) and the legacy wrapped one (data.normal).</summary>
    private static List<RawItem> Parse(string json)
    {
        using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(json) ? "{}" : json);
        var root = doc.RootElement;
        if (root.TryGetProperty("status_code", out var sc) && sc.ValueKind == JsonValueKind.Number && sc.GetInt32() != 200)
            throw new ValidationError(root.TryGetProperty("message", out var msg) ? $"Recognition failed: {msg}" : "Recognition failed.");
        if (root.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Object)
            root = data;

        var items = new List<RawItem>();

        if (root.TryGetProperty("views", out var views) && views.ValueKind == JsonValueKind.Array)
            foreach (var v in views.EnumerateArray())
            {
                if (!v.TryGetProperty("ocr_results", out var o) || o.ValueKind != JsonValueKind.Object) continue;
                var texts = Arr(o, "rec_text");
                var polys = Arr(o, "rec_polys");
                var scores = Arr(o, "rec_scores");
                var types = Arr(o, "type");
                for (int i = 0; i < texts.Count && i < polys.Count; i++)
                {
                    var text = texts[i].ValueKind == JsonValueKind.String ? texts[i].GetString() : null;
                    if (string.IsNullOrWhiteSpace(text)) continue;
                    if (i < types.Count && types[i].ValueKind == JsonValueKind.String && types[i].GetString() == "border") continue;
                    if (!Bounds(polys[i], out var b)) continue;
                    items.Add(new RawItem
                    {
                        Text = text.Trim(), X1 = b[0], Y1 = b[1], X2 = b[2], Y2 = b[3],
                        Score = i < scores.Count && scores[i].ValueKind == JsonValueKind.Number ? scores[i].GetDouble() : 1,
                    });
                }
            }

        if (root.TryGetProperty("normal", out var normal) && normal.ValueKind == JsonValueKind.Array)
            foreach (var n in normal.EnumerateArray())
            {
                var text = n.TryGetProperty("text", out var t)
                    ? (t.ValueKind == JsonValueKind.Array ? string.Join(" ", t.EnumerateArray().Select(e => e.ToString())) : t.ToString())
                    : null;
                if (string.IsNullOrWhiteSpace(text) || !n.TryGetProperty("location", out var loc) || !Bounds(loc, out var b)) continue;
                items.Add(new RawItem { Text = text.Trim(), X1 = b[0], Y1 = b[1], X2 = b[2], Y2 = b[3], Score = 1 });
            }

        if (root.TryGetProperty("tolerance", out var tols) && tols.ValueKind == JsonValueKind.Array)
            foreach (var t in tols.EnumerateArray())
            {
                if (!t.TryGetProperty("location", out var loc) || !Bounds(loc, out var b)) continue;
                var baseText = Str(t, "base");
                var tol = new RawItem
                {
                    Text = ((Str(t, "prefix") ?? "") + (baseText ?? "")).Trim(),
                    Upper = Str(t, "up"), Lower = Str(t, "down"),
                    X1 = b[0], Y1 = b[1], X2 = b[2], Y2 = b[3], Score = 1,
                };
                // The parts the tolerance was assembled from are not balloons of their own.
                items.RemoveAll(i => i.X1 >= b[0] - 2 && i.Y1 >= b[1] - 2 && i.X2 <= b[2] + 2 && i.Y2 <= b[3] + 2
                                     && (i.Text == baseText || i.Text == tol.Upper || i.Text == tol.Lower || tol.Text.Contains(i.Text)));
                items.Add(tol);
            }

        if (root.TryGetProperty("notes", out var notes) && notes.ValueKind == JsonValueKind.Array)
            foreach (var n in notes.EnumerateArray())
            {
                var text = Str(n, "content") ?? Str(n, "text");
                if (string.IsNullOrWhiteSpace(text) || !n.TryGetProperty("location", out var loc) || !Bounds(loc, out var b)) continue;
                items.Add(new RawItem { Text = text.Trim(), IsNote = true, X1 = b[0], Y1 = b[1], X2 = b[2], Y2 = b[3], Score = 1 });
            }

        return items;
    }

    private static List<JsonElement> Arr(JsonElement o, string name) =>
        o.TryGetProperty(name, out var a) && a.ValueKind == JsonValueKind.Array ? a.EnumerateArray().ToList() : new();

    private static string Str(JsonElement o, string name) =>
        o.TryGetProperty(name, out var v) && v.ValueKind != JsonValueKind.Null ? v.ToString() : null;

    /// <summary>Min/max of a polygon [[x,y],...] or a flat [x1,y1,x2,y2].</summary>
    private static bool Bounds(JsonElement poly, out double[] b)
    {
        b = null;
        if (poly.ValueKind != JsonValueKind.Array) return false;
        var xs = new List<double>();
        var ys = new List<double>();
        var parts = poly.EnumerateArray().ToList();
        if (parts.Count > 0 && parts[0].ValueKind == JsonValueKind.Array)
        {
            foreach (var p in parts)
            {
                var c = p.EnumerateArray().ToList();
                if (c.Count < 2 || c[0].ValueKind != JsonValueKind.Number || c[1].ValueKind != JsonValueKind.Number) continue;
                xs.Add(c[0].GetDouble());
                ys.Add(c[1].GetDouble());
            }
        }
        else if (parts.Count >= 4 && parts.All(p => p.ValueKind == JsonValueKind.Number))
        {
            xs.Add(parts[0].GetDouble()); ys.Add(parts[1].GetDouble());
            xs.Add(parts[2].GetDouble()); ys.Add(parts[3].GetDouble());
        }
        if (xs.Count == 0) return false;
        b = new[] { xs.Min(), ys.Min(), xs.Max(), ys.Max() };
        return b[2] > b[0] && b[3] > b[1];
    }

    /// <summary>
    /// Everything read, as one balloon: reading order, texts joined, boxes
    /// unioned. If the model called any of it a note, only the notes are kept.
    /// Nothing read still gives one empty balloon over the selection, as in
    /// One Supply, so the operator can type it.
    /// </summary>
    private static List<RecognizedBalloon> MergeSingle(List<RecognizedBalloon> items, RecognizeRegionRequest r)
    {
        if (items.Count == 0)
            return new()
            {
                new RecognizedBalloon
                {
                    Symbol = "", OriginalSymbol = "",
                    BBoxX1 = r.X, BBoxY1 = r.Y, BBoxX2 = r.X + r.Width, BBoxY2 = r.Y + r.Height,
                }
            };

        var pool = items.Any(i => i.IsNote) ? items.Where(i => i.IsNote).ToList() : items;
        var lineHeight = pool.Average(i => (double)(i.BBoxY2 - i.BBoxY1));
        var ordered = pool
            .OrderBy(i => Math.Round((double)((i.BBoxY1 + i.BBoxY2) / 2) / Math.Max(0.01, lineHeight * 0.6)))
            .ThenBy(i => i.BBoxX1)
            .ToList();

        var tol = ordered.FirstOrDefault(i => !string.IsNullOrEmpty(i.UpperTol) || !string.IsNullOrEmpty(i.LowerTol));
        var text = string.Join(" ", ordered.Select(i => i.Symbol).Where(s => !string.IsNullOrWhiteSpace(s)));
        return new()
        {
            new RecognizedBalloon
            {
                Symbol = text, OriginalSymbol = text,
                UpperTol = tol?.UpperTol, LowerTol = tol?.LowerTol,
                IsNote = pool.Any(i => i.IsNote),
                BBoxX1 = ordered.Min(i => i.BBoxX1), BBoxY1 = ordered.Min(i => i.BBoxY1),
                BBoxX2 = ordered.Max(i => i.BBoxX2), BBoxY2 = ordered.Max(i => i.BBoxY2),
                Confidence = ordered.Max(i => i.Confidence),
            }
        };
    }
}
