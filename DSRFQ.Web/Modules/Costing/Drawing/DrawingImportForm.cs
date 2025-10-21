using Serenity.ComponentModel;
using System;
namespace DSRFQ.Drawing.Forms;

[FormScript("Drawing.DrawingImport")]

public class DrawingImportForm
{
    [MultipleFileUploadEditor, Required]
    public String FileName { get; set; }
    
}