using Serenity.ComponentModel;
using System;
using System.ComponentModel.DataAnnotations;

namespace DSRFQ.Drawing.Forms;

[FormScript("Drawing.DrawingImport")]

public class DrawingImportForm
{
    [FileUploadEditor(AllowedExtensions = ".pdf;.jpg;.png;.jpeg"), Serenity.ComponentModel.Required,DisplayName("2D")]
    public String TwoDFileName { get; set; }
    [FileUploadEditor(AllowedExtensions = ".stp"),DisplayName("3D")]
    public String ThreeDFileName { get; set; }
    
}