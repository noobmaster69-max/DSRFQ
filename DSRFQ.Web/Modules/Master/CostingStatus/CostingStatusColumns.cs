using Serenity.ComponentModel;
using System;
using System.ComponentModel;

namespace DSRFQ.Master.Columns;

[ColumnsScript("Master.CostingStatus")]
[BasedOnRow(typeof(CostingStatusRow), CheckNames = true)]
public class CostingStatusColumns
{
    [EditLink, DisplayName("Db.Shared.RecordId"), AlignRight,SortOrder(1,false)]
    public int Id { get; set; }
    [EditLink]
    public string Name { get; set; }
    public string Color { get; set; }

}