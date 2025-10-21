using Serenity.ComponentModel;
using System;

namespace DSRFQ.Master.Forms;

[FormScript("Master.Currencies")]
[BasedOnRow(typeof(CurrenciesRow), CheckNames = true)]
public class CurrenciesForm
{
    public string Code { get; set; }
    public string Name { get; set; }
    
}