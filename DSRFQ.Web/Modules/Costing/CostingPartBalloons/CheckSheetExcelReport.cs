using OfficeOpenXml;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace DSRFQ.Costing;

/// <summary>
/// The check sheet as DSEFACTORY's SMARTQC exports it: its own Excel
/// templates, filled the same way.
/// </summary>
/// <remarks>
/// Ported from DSEFACTORY Modules/Sqc/SqcCheckItemRev/SqcCheckItemRevEndpoint.cs
/// (ListExcel, ListExcelIP, ListExcelFPLP), which are three copies of one
/// routine differing only in the numbers in <see cref="Forms"/>. Same library
/// (EPPlus 4.5.3.3), same templates (App_Data/QcTemplates, copied from
/// DSEFACTORY's App_Data/upload/QcTemplates), same cells:
///
///   A critical, B sequence, C check item name, D symbol,
///   H Remark1 (+tol), I Remark2 (-tol) - merged H:I when there is no -tol -
///   J method; the symbol column F in the Y14.5M-2009 font.
///
/// One worksheet per page of N items, copied from the template sheet, which is
/// then hidden rather than deleted (deleting it upsets EPPlus's drawings), and
/// the template's "Page 1" watermark renumbered per sheet.
///
/// Worksheets are indexed from 0, as in DSEFACTORY: EPPlus 4.5 on .NET Core
/// counts them from 0 unless IsWorksheets1Based is set, and neither app sets it.
/// </remarks>
public static class CheckSheetExcelReport
{
    public sealed class Form
    {
        public string Template { get; init; }
        /// <summary>Sheet name prefix, the form's document number.</summary>
        public string SheetName { get; init; }
        public int ItemsPerSheet { get; init; }
        public int FirstRow { get; init; }
        public string DrawingCell { get; init; }
        public string RevisionCell { get; init; }
        public string MaterialCell { get; init; }
    }

    /// <summary>The three SMARTQC forms, by the key the client sends.</summary>
    public static readonly IReadOnlyDictionary<string, Form> Forms = new Dictionary<string, Form>(StringComparer.OrdinalIgnoreCase)
    {
        // ListExcel
        ["CheckSheet"] = new() { Template = "CheckSheet.xlsx", SheetName = "I-QA-003", ItemsPerSheet = 20, FirstRow = 16,
                                 DrawingCell = "A12", RevisionCell = "K12", MaterialCell = "K11" },
        // ListExcelIP - in-process inspection
        ["IP"] = new() { Template = "IPCheckSheet.xlsx", SheetName = "I-QA-001", ItemsPerSheet = 23, FirstRow = 11,
                         DrawingCell = "A7", RevisionCell = "K7", MaterialCell = "K6" },
        // ListExcelFPLP - first piece / last piece
        ["FPLP"] = new() { Template = "FPLPCheckSheet.xlsx", SheetName = "I-QA-002", ItemsPerSheet = 27, FirstRow = 13,
                           DrawingCell = "A7", RevisionCell = "K7", MaterialCell = "K6" },
    };

    public sealed class Item
    {
        public int Sequence { get; set; }
        public string CheckItemName { get; set; }
        public string Symbol { get; set; }
        /// <summary>SMARTQC's Remark1 - where its balloon conversion puts +tol.</summary>
        public string PlusTol { get; set; }
        /// <summary>SMARTQC's Remark2 - where its balloon conversion puts -tol.</summary>
        public string MinusTol { get; set; }
        public string MethodName { get; set; }
        public bool IsCritical { get; set; }
    }

    /// <summary>
    /// Replace a header cell's text, rich text or not.
    /// </summary>
    /// <remarks>
    /// The IP and FP/LP templates keep "Rev No. :" and "Material :" as rich
    /// text. EPPlus 4.5 then ignores a plain .Value assignment and saves the
    /// cell EMPTY - the label and the value both gone. DSEFACTORY's
    /// ListExcelIP / ListExcelFPLP assign .Value straight, on the same
    /// templates with the same EPPlus, so those two forms come out without a
    /// revision or material there too. Dropping the rich text first fixes it;
    /// the cell keeps its own font and alignment.
    /// </remarks>
    private static void SetText(ExcelRange cell, string text)
    {
        if (cell.IsRichText)
        {
            cell.RichText.Clear();
            cell.IsRichText = false;
        }
        cell.Value = text;
    }

    public static byte[] Build(string templateFolder, Form form, IList<Item> items,
        string partNumber, string partRev, string material)
    {
        if (items == null || items.Count == 0)
            throw new ValidationError("No check items to export - balloon the drawing first.");

        var templateFile = new FileInfo(Path.Combine(templateFolder, form.Template));
        if (!templateFile.Exists)
            throw new FileNotFoundException($"Check sheet template not found at: {templateFile.FullName}");

        var data = items.OrderBy(x => x.Sequence).ToList();
        int lastRow = form.FirstRow + form.ItemsPerSheet - 1;

        using var excel = new ExcelPackage(templateFile);
        var templateSheet = excel.Workbook.Worksheets[0];
        int totalSheets = (int)Math.Ceiling((double)data.Count / form.ItemsPerSheet);

        for (int sheetIndex = 0; sheetIndex < totalSheets; sheetIndex++)
        {
            var worksheet = excel.Workbook.Worksheets.Add($"{form.SheetName}-{sheetIndex + 1}", templateSheet);

            SetText(worksheet.Cells[form.DrawingCell], $"Reference Drawing No: {partNumber}");
            SetText(worksheet.Cells[form.RevisionCell], $"Rev No. : {partRev}");
            SetText(worksheet.Cells[form.MaterialCell], $"Material: {material}");

            int startIdx = sheetIndex * form.ItemsPerSheet;
            int endIdx = Math.Min(startIdx + form.ItemsPerSheet, data.Count);
            for (int i = startIdx; i < endIdx; i++)
            {
                var item = data[i];
                int excelRow = form.FirstRow + (i - startIdx);

                worksheet.Cells[excelRow, 1].Value = item.IsCritical ? "Yes" : "";
                worksheet.Cells[excelRow, 2].Value = item.Sequence;
                worksheet.Cells[excelRow, 3].Value = item.CheckItemName;
                worksheet.Cells[excelRow, 4].Value = item.Symbol;
                worksheet.Cells[excelRow, 8].Value = item.PlusTol;
                worksheet.Cells[excelRow, 9].Value = item.MinusTol;

                // One tolerance spans both remark columns; two sit side by side.
                string mergeAddress = $"H{excelRow}:I{excelRow}";
                if (string.IsNullOrWhiteSpace(item.MinusTol))
                {
                    if (!worksheet.Cells[mergeAddress].Merge)
                        worksheet.Cells[mergeAddress].Merge = true;
                }
                else if (worksheet.Cells[mergeAddress].Merge)
                {
                    worksheet.Cells[mergeAddress].Merge = false;
                }

                worksheet.Cells[excelRow, 10].Value = item.MethodName;
            }

            // The symbol in the GD&T face, as SMARTQC's grid shows it - on D.
            // DSEFACTORY sets column F, but the templates merge D:G for the
            // symbol, so F is a hidden cell and setting it shows nothing; the
            // symbol only came out right where the template itself had D in
            // the GD&T face. The IP template does not on rows 28-33, so there a
            // frame printed as its raw CAD code ({¿~|Ø~.`0`0`5...}).
            worksheet.Cells[$"D{form.FirstRow}:D{lastRow}"].Style.Font.Name = "Y14.5M-2009";

            // The template carries a "Page 1" watermark - in the header, or in a
            // shape. Renumber it on each sheet.
            int pageNumber = sheetIndex + 1;
            if (!string.IsNullOrEmpty(worksheet.HeaderFooter.OddHeader.CenteredText))
                worksheet.HeaderFooter.OddHeader.CenteredText =
                    worksheet.HeaderFooter.OddHeader.CenteredText.Replace("Page 1", $"Page {pageNumber}");
            if (!string.IsNullOrEmpty(worksheet.HeaderFooter.FirstHeader.CenteredText))
                worksheet.HeaderFooter.FirstHeader.CenteredText =
                    worksheet.HeaderFooter.FirstHeader.CenteredText.Replace("Page 1", $"Page {pageNumber}");
            foreach (var drawing in worksheet.Drawings)
            {
                if (drawing is OfficeOpenXml.Drawing.ExcelShape shape
                    && shape.Text != null && shape.Text.Contains("Page 1"))
                    shape.Text = shape.Text.Replace("Page 1", $"Page {pageNumber}");
            }

            // Pinned so a long symbol cannot widen the printed page.
            worksheet.PrinterSettings.PrintArea = worksheet.Cells["A1:P100"];
        }

        // Hidden, not deleted: deleting the template upsets EPPlus's drawings.
        // Renamed first so it can never clash with the sheets made from it.
        templateSheet.Name = "_Template_Hidden";
        templateSheet.Hidden = eWorkSheetHidden.VeryHidden;

        if (totalSheets == 1)
            excel.Workbook.Worksheets[1].Name = form.SheetName;

        return excel.GetAsByteArray();
    }
}
