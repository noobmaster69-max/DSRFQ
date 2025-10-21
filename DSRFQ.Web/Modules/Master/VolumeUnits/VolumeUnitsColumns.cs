using Serenity.ComponentModel;
using System;
using System.ComponentModel;

namespace DSRFQ.Master.Columns;

[ColumnsScript("Master.VolumeUnits")]
[BasedOnRow(typeof(VolumeUnitsRow), CheckNames = true)]
public class VolumeUnitsColumns
{
    [EditLink, DisplayName("Db.Shared.RecordId"), AlignRight]
    public int Id { get; set; }
    [EditLink]
    public string Code { get; set; }
    public string Name { get; set; }
    [DateTimeFormatter(DisplayFormat = "yyyy-MM-dd HH:mm"), Width(120)]
    public DateTime InsertDate { get; set; }
    public string InsertBy { get; set; }
    [DateTimeFormatter(DisplayFormat = "yyyy-MM-dd HH:mm"), Width(120)]
    public DateTime UpdateDate { get; set; }
    public string UpdateBy { get; set; }
    [DateTimeFormatter(DisplayFormat = "yyyy-MM-dd HH:mm"), Width(120)]
    public DateTime DeleteDate { get; set; }
    public string DeleteBy { get; set; }
}