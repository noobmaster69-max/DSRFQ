using Serenity.ComponentModel;
using System;
using System.ComponentModel;

namespace DSRFQ.Master.Columns;

[ColumnsScript("Master.ToolTemplateConversion")]
[BasedOnRow(typeof(ToolTemplateConversionRow), CheckNames = true)]
public class ToolTemplateConversionColumns
{
    [EditLink, DisplayName("Db.Shared.RecordId"), AlignRight]
    public int Id { get; set; }
    [EditLink]
    public string Name { get; set; }
    [DisplayName("Replace With"), Width(110)]
    public string ReplacementText { get; set; }
    // Rendered as thumbnails by ToolTemplateConversionGrid.getColumns. DSEFACTORY
    // used its own [InlineImageFormatter] here, but that attribute is a DS_ERP
    // custom formatter backed by a jQuery implementation and an ImageDialog,
    // none of which exist in this project.
    [Width(90)]
    public string LogoPicture { get; set; }
    [Width(90)]
    public string TablePicture { get; set; }
    public bool Default { get; set; }
    [DateTimeFormatter(DisplayFormat = "yyyy-MM-dd HH:mm:ss"), Width(120)]
    public DateTime InsertDate { get; set; }
    [DateTimeFormatter(DisplayFormat = "yyyy-MM-dd HH:mm:ss"), Width(120)]
    public DateTime UpdateDate { get; set; }
}
