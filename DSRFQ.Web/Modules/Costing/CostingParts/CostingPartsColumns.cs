using Serenity.ComponentModel;
using System;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using DSRFQ.Common;

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
    [InlineImageFormatter]
    public string PartPicture { get; set; }
    public string PartNumber { get; set; }
    public string Revision { get; set; }
    public string Description { get; set; }
   
    
    [Width(120)]
   public string OcrStatusName { get; set; }
   [Width(120)]
   public string DrawingConversionStatusName { get; set; }
   [Width(120)]
   public string CostingStatusName { get; set; }
   // No Machine column here on purpose. A bare machine name in a 200px cell
   // says less than it seems to -- it cannot show the picture, the axis count
   // or the work envelope, and a turn-mill part has two machines that one cell
   // cannot hold. The workspace's Costing tab shows them properly, one card per
   // machine. CostingParts.CostingMachineName is still written and still
   // queryable; it is only kept off this grid.
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