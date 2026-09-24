using ClosedXML.Excel;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;

namespace DSRFQ.Costing;

/// <summary>
/// The balloon list as a formatted .xlsx - the characteristics an inspector has
/// to measure, one line each.
/// </summary>
/// <remarks>
/// Ported from One Supply (C:\Aizera\RPA\Bubble), core/exporters/excel:
/// StandardExcelExporter.export plus the two pieces of BaseExporter it leans on,
/// _format_special_value and style_cloner.optimize_excel_symbols.
///
/// This is deliberately NOT Serenity's ListExcel. That dumps whatever the grid
/// is showing, which for balloons means database columns in database order,
/// numbers as text, and GD&amp;T glyphs in Calibri - where ⌖ and ⌭ render as
/// boxes on most machines and the sheet is unreadable as an inspection
/// document. Everything below exists to stop one of those.
///
/// ClosedXML rather than EPPlus, which is what One Supply's openpyxl maps onto
/// most directly in .NET: it is already in the dependency graph behind
/// Serenity's IExcelExporter, so this adds no package. EPPlus would - and its
/// last LGPL version is 4.5.3.3, which is why DS_ERP pins that one.
/// </remarks>
public static class BalloonExcelReport
{
    /// <summary>One row of the report, already resolved from the database.</summary>
    public class Line
    {
        public string BalloonNo { get; set; }
        /// <summary>The catalogued GD&amp;T glyph, e.g. "⌖". One Supply's column 2.</summary>
        public string Glyph { get; set; }
        public string Characteristic { get; set; }
        public string Symbol { get; set; }
        public string UpperTol { get; set; }
        public string LowerTol { get; set; }
        public string Quantity { get; set; }
        public int? PageNumber { get; set; }
        public string Section { get; set; }
        public bool IsNote { get; set; }
    }

    /// <summary>
    /// Glyphs the default spreadsheet face does not carry.
    /// </summary>
    /// <remarks>
    /// One Supply's GDT_RARE_SYMBOLS, unchanged. Calibri has no glyph for any of
    /// these, so Excel substitutes and the cell shows a box - the one failure
    /// mode that makes an inspection sheet actively misleading rather than just
    /// plain, because a missing characteristic reads as no characteristic.
    ///
    /// Ø U+00D8 is deliberately absent even though the catalogue uses it: it is
    /// a Latin letter and every face has it. ⌀ U+2300, the one recognition
    /// emits, is here.
    /// </remarks>
    private static readonly HashSet<string> RareGdtSymbols = new()
    {
        "\u2316",   // ⌖ position
        "\u232F",   // ⌯ symmetry
        "\u23E4",   // ⏤ straightness
        "\u2334",   // ⌴ counterbore
        "\u25B1",   // ▱ flatness
        "\u232D",   // ⌭ cylindricity
        "\u2312",   // ⌒ profile of a line
        "\u2313",   // ⌓ profile of a surface
        "\u2330",   // ⌰ total runout
        "\u2300",   // ⌀ diameter
    };

    /// <summary>The face those glyphs do exist in, on Windows.</summary>
    private const string SymbolFont = "Segoe UI Symbol";

    private static readonly string[] Headers =
        { "No", "GD&T", "Characteristic", "Symbol", "Upper Tol", "Lower Tol", "Qty", "Page", "Region", "Note" };

    /// <summary>1-based column indexes, so the two style passes below agree with the writes.</summary>
    private const int ColGlyph = 2;
    private const int ColSymbol = 4;

    /// <summary>
    /// Leading zeros and limit ranges, as One Supply writes them.
    /// </summary>
    /// <remarks>
    /// Port of BaseExporter._format_special_value with smart formatting on.
    /// Drawings are written ".380" and inspection reports are read "0.380" -
    /// the leading zero is not decoration, it is what stops a tired eye reading
    /// .380 as 380. And a limit pair arrives as ".100/.097", high value first,
    /// which is backwards from how a range is read; it comes out "0.097-0.100".
    /// </remarks>
    public static string FormatValue(string value)
    {
        var text = (value ?? "").Trim();
        if (text.Length == 0)
            return text;

        // "4X .100/.097" -> "4X 0.097-0.100". Both sides needing a decimal
        // point is what keeps a genuine fraction like 1/2 intact.
        text = Regex.Replace(text, @"(-?\d*\.?\d+)\s*/\s*(-?\d*\.?\d+)", m =>
        {
            var a = m.Groups[1].Value;
            var b = m.Groups[2].Value;
            if (!a.Contains('.') && !b.Contains('.'))
                return m.Value;
            var p1 = FixLeadingZero(a);
            var p2 = FixLeadingZero(b);
            return TryOrder(ref p1, ref p2) ? $"{p1}-{p2}" : m.Value;
        });

        // Already a range: put the small value first. Anchored, so an
        // asymmetric tolerance written "0.653 +0.002--0.000" is left alone.
        text = Regex.Replace(text, @"^(\d+\s*[Xx\u00D7]\s*)?(-?\d+\.\d+)\s*-\s*(-?\d+\.\d+)$", m =>
        {
            var p1 = FixLeadingZero(m.Groups[2].Value);
            var p2 = FixLeadingZero(m.Groups[3].Value);
            return TryOrder(ref p1, ref p2) ? $"{m.Groups[1].Value}{p1}-{p2}" : m.Value;
        });

        // Any remaining bare ".5" / "-.5". The lookbehind keeps "1.5" whole.
        return Regex.Replace(text, @"(?<!\d)-?\.\d+", m =>
            m.Value.StartsWith("-.") ? "-0." + m.Value[2..] : "0" + m.Value);
    }

    /// <summary>".10" -> "0.10", "-.10" -> "-0.10".</summary>
    private static string FixLeadingZero(string s)
    {
        var text = (s ?? "").Trim();
        if (text.StartsWith("."))
            return "0" + text;
        if (text.StartsWith("-."))
            return "-0." + text[2..];
        return text;
    }

    /// <summary>Smallest first. False when the pair will not parse as numbers.</summary>
    private static bool TryOrder(ref string a, ref string b)
    {
        if (!double.TryParse(a, NumberStyles.Float, CultureInfo.InvariantCulture, out var x) ||
            !double.TryParse(b, NumberStyles.Float, CultureInfo.InvariantCulture, out var y))
            return false;
        if (x > y)
            (a, b) = (b, a);
        return true;
    }

    /// <summary>
    /// True for a cell that is nothing but one rare GD&amp;T glyph.
    /// </summary>
    /// <remarks>
    /// Port of is_pure_gdt_rare_symbol_cell, and the restriction is the whole
    /// point of it. Restyling every cell that merely CONTAINS a glyph would
    /// re-face the symbol column - "4X ⌀.380 THRU" - and set a dimension in
    /// 14pt bold Segoe UI Symbol beside its neighbours in 11pt Calibri, which
    /// looks like a defect rather than an emphasis.
    /// </remarks>
    private static bool IsPureRareSymbol(string value)
    {
        var text = (value ?? "").Trim();
        return text.Length > 0 && RareGdtSymbols.Contains(text);
    }

    /// <summary>Build the workbook. Returns the .xlsx bytes.</summary>
    public static byte[] Build(string partNumber, string revision, IEnumerable<Line> lines)
    {
        var rows = lines?.ToList() ?? new List<Line>();

        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Balloons");

        // A title row, which One Supply does not have and this needs: its
        // export is one drawing open in one window, where the file name is the
        // context. Here the sheet leaves the building on its own.
        var title = $"Balloon list - {partNumber}"
            + (string.IsNullOrWhiteSpace(revision) ? "" : $" Rev {revision}");
        ws.Cell(1, 1).Value = title;
        ws.Range(1, 1, 1, Headers.Length).Merge();
        ws.Cell(1, 1).Style.Font.Bold = true;
        ws.Cell(1, 1).Style.Font.FontSize = 13;
        ws.Cell(1, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;

        const int headerRow = 2;
        for (var c = 0; c < Headers.Length; c++)
        {
            var cell = ws.Cell(headerRow, c + 1);
            cell.Value = Headers[c];
            cell.Style.Font.Bold = true;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#F1F5F9");
            cell.Style.Border.BottomBorder = XLBorderStyleValues.Thin;
        }

        var r = headerRow;
        foreach (var line in rows)
        {
            r++;
            ws.Cell(r, 1).Value = line.BalloonNo ?? "";
            ws.Cell(r, ColGlyph).Value = line.Glyph ?? "";
            ws.Cell(r, 3).Value = line.Characteristic ?? "";
            ws.Cell(r, ColSymbol).Value = FormatValue(line.Symbol);
            ws.Cell(r, 5).Value = FormatValue(line.UpperTol);
            ws.Cell(r, 6).Value = FormatValue(line.LowerTol);
            ws.Cell(r, 7).Value = line.Quantity ?? "";
            ws.Cell(r, 8).Value = line.PageNumber?.ToString(CultureInfo.InvariantCulture) ?? "";
            ws.Cell(r, 9).Value = line.Section ?? "";
            // One Supply writes 是/否 here for its audited flag; the column that
            // matters in this system is whether the line is a note at all,
            // because a note is not something anybody measures.
            ws.Cell(r, 10).Value = line.IsNote ? "Note" : "";

            // Text, explicitly. Left to itself Excel reads "0.380" as a number
            // and drops the trailing zero, and reads "1-2" as a date - both of
            // which silently corrupt a tolerance.
            ws.Range(r, 1, r, Headers.Length).Style.NumberFormat.Format = "@";
            ws.Range(r, 5, r, 8).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
            ws.Cell(r, ColGlyph).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

            if (line.IsNote)
                ws.Range(r, 1, r, Headers.Length).Style.Font.FontColor = XLColor.FromHtml("#64748B");
        }

        // The symbol column carries GD&T glyphs whatever else it holds, so it
        // gets a face that has them outright - the per-cell pass below only
        // reaches cells that are nothing BUT a glyph.
        if (r > headerRow)
            ws.Range(headerRow + 1, ColSymbol, r, ColSymbol).Style.Font.FontName = SymbolFont;

        OptimizeSymbols(ws);

        ws.SheetView.FreezeRows(headerRow);
        if (r > headerRow)
            ws.Range(headerRow, 1, r, Headers.Length).SetAutoFilter();

        // Widths, as One Supply computes them: content-driven, capped so one
        // long note cannot push every other column off the screen.
        ws.Columns().AdjustToContents();
        foreach (var col in ws.ColumnsUsed())
            if (col.Width > 50)
                col.Width = 50;
        // AdjustToContents measures a single 14pt glyph as a narrow column and
        // then the bold size bump overflows it, so this one is set by hand.
        ws.Column(ColGlyph).Width = 7;
        ws.Column(10).Width = 10;

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    /// <summary>
    /// Re-face the cells that are a single rare glyph.
    /// </summary>
    /// <remarks>
    /// Port of style_cloner.optimize_excel_symbols, including the size bump:
    /// these glyphs are drawn small relative to their em box, so at the row's
    /// own size ⌖ and ⌭ are hard to tell apart at a glance, which is the one
    /// distinction the column exists to make.
    /// </remarks>
    private static void OptimizeSymbols(IXLWorksheet ws)
    {
        foreach (var cell in ws.CellsUsed())
        {
            if (!IsPureRareSymbol(cell.GetString()))
                continue;
            var size = cell.Style.Font.FontSize > 0 ? cell.Style.Font.FontSize : 10;
            cell.Style.Font.FontName = SymbolFont;
            cell.Style.Font.FontSize = Math.Max(size + 3, 14);
            cell.Style.Font.Bold = true;
        }
    }
}
