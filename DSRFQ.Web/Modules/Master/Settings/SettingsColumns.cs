using Serenity.ComponentModel;
using System;
using System.ComponentModel;

namespace DSRFQ.Master.Columns;

[ColumnsScript("Master.Settings")]
[BasedOnRow(typeof(SettingsRow), CheckNames = true)]
public class SettingsColumns
{
    [EditLink, DisplayName("Db.Shared.RecordId"), AlignRight]
    public int Id { get; set; }
    [EditLink, Width(180)]
    public bool DatumAddMissing { get; set; }
    [Width(180)]
    public decimal DatumAddMinConfidence { get; set; }
    [Width(160)]
    public string SubNumberSeparator { get; set; }
    [DateTimeFormatter(DisplayFormat = "yyyy-MM-dd HH:mm:ss"), Width(140)]
    public DateTime UpdateDate { get; set; }
}
