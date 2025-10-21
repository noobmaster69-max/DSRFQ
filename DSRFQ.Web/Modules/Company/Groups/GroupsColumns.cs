using Serenity.ComponentModel;
using System;
using System.ComponentModel;

namespace DSRFQ.Company.Columns;

[ColumnsScript("Company.Groups")]
[BasedOnRow(typeof(GroupsRow), CheckNames = true)]
public class GroupsColumns
{
    [EditLink, DisplayName("Db.Shared.RecordId"), AlignRight]
    public int Id { get; set; }

    [EditLink] public string Name { get; set; }
    public string Description { get; set; }
    public DateTime InsertDate { get; set; }
    public string InsertBy { get; set; }
    public DateTime UpdateDate { get; set; }
    public string UpdateBy { get; set; }
    public DateTime DeleteDate { get; set; }
    public string DeleteBy { get; set; }
}