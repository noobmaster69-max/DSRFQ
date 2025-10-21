using System;
using System.Collections.Generic;
using Serenity.Data;

namespace DSRFQ.Web.Modules;

public interface IMultiCompanyRow
{
    Int32Field CompanyIdField { get; }
    Int32Field GroupIdField { get; }
}

