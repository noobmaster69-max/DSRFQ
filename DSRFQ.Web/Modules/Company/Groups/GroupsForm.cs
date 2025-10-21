using Serenity.ComponentModel;
using System;

namespace DSRFQ.Company.Forms;

[FormScript("Company.Groups")]
[BasedOnRow(typeof(GroupsRow), CheckNames = true)]
public class GroupsForm
{
    public string Name { get; set; }
    public string Description { get; set; }
    public ListField<Int32> CompanyList { get; set; }
}