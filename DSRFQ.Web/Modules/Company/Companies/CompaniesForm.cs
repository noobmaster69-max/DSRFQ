using Serenity.ComponentModel;
using System;

namespace DSRFQ.Company.Forms;

[FormScript("Company.Companies")]
[BasedOnRow(typeof(CompaniesRow), CheckNames = true)]
public class CompaniesForm
{
    public string Name { get; set; }
    public string Picture { get; set; }
    public string OrganizationId { get; set; }

}