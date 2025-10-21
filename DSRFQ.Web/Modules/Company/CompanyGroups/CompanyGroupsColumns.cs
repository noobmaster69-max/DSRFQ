using Serenity.ComponentModel;
using System;
using System.ComponentModel;

namespace DSRFQ.Company.Columns;

[ColumnsScript("Company.CompanyGroups")]
[BasedOnRow(typeof(CompanyGroupsRow), CheckNames = true)]
public class CompanyGroupsColumns
{
    [EditLink, DisplayName("Db.Shared.RecordId"), AlignRight]
    public int Id { get; set; }
    public string CompanyName { get; set; }
    public string GroupName { get; set; }
    
}