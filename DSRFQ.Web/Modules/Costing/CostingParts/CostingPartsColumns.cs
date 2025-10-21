using Serenity.ComponentModel;
using System;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace DSRFQ.Costing.Columns;

[ColumnsScript("Costing.CostingParts")]
[BasedOnRow(typeof(CostingPartsRow), CheckNames = true)]
public class CostingPartsColumns
{
    [DisplayName("Db.Shared.RecordId"), AlignRight,SortOrder(1,true)]
    public int Id { get; set; }
    [Width(400)]
    public string DocumentList { get; set; }
    public string Message { get; set; }
    public string PartNumber { get; set; }
    public string Revision { get; set; }
    public string Description { get; set; }
   
    public string PartPicture { get; set; }
    [Width(120)]
   public string OcrStatusName { get; set; }
   [Width(120)]
   public string DrawingConversionStatusName { get; set; }
   [Width(120)]
   public string CostingStatusName { get; set; }
   [Width(120)]
   public string BalloonStatusName { get; set; }
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