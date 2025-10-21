using Serenity.ComponentModel;
using System;

namespace DSRFQ.Company.Forms;

[FormScript("Company.CompanyGroups")]
[BasedOnRow(typeof(CompanyGroupsRow), CheckNames = true)]
public class CompanyGroupsForm
{
    public int CompanyId { get; set; }
    public int GroupId { get; set; }
    
}