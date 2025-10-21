using System;
using DSRFQ.AppServices;
using Serenity;
using Serenity.Abstractions;
using Serenity.Data;
using Serenity.Web;

namespace DSRFQ.Web.Modules;


public class MultiCompanyRowLookupScript<TRow> : RowLookupScript<TRow>
    where TRow : class, IRow, IMultiCompanyRow, new()
{
    private readonly ITwoLevelCache twoLevelCache;
    private readonly IUserAccessor userAccessor;

    public MultiCompanyRowLookupScript(ISqlConnections sqlConnections, ITwoLevelCache twoLevelCache, IUserAccessor userAccessor) : base(sqlConnections)
    {
        Expiration = TimeSpan.FromDays(-1);
        this.twoLevelCache = twoLevelCache ?? throw new ArgumentNullException(nameof(twoLevelCache));
        this.userAccessor = userAccessor ?? throw new ArgumentNullException(nameof(userAccessor));
    }

    protected override void PrepareQuery(SqlQuery query)
    {
        base.PrepareQuery(query);
        AddCompanyFilter(query);
    }

    protected void AddCompanyFilter(SqlQuery query)
    {
        var r = new TRow();
        if (userAccessor.User.GetCompanyId() != null)
        {
            query.Where((new Criteria(r.CompanyIdField) == userAccessor.User.GetCompanyId().Value && new Criteria(r.CompanyIdField).IsNotNull())| new Criteria(r.CompanyIdField).IsNull());
        }
        else
        {
            if (userAccessor.User.GetGroupId() != null)
            {
                query.Where((new Criteria(r.GroupIdField) == userAccessor.User.GetGroupId().Value && new Criteria(r.GroupIdField).IsNotNull()));
            }
        }
        
        
    }

    public override string GetScript()
    {
        if (userAccessor.User.GetCompanyId() != null)
        {
            return twoLevelCache.GetLocalStoreOnly(
            $"MultiTenantLookup:{this.ScriptName}:{userAccessor.User.GetCompanyId().Value}",
            TimeSpan.FromHours(1),
            new TRow().GetFields().GenerationKey, () =>
            {
                return base.GetScript();
            });
        }
        else if (userAccessor.User.GetCompanyId() == null && userAccessor.User.GetGroupId() != null)
        {
            return twoLevelCache.GetLocalStoreOnly(
                $"MultiTenantLookup:{this.ScriptName}:{userAccessor.User.GetGroupId().Value}",
                TimeSpan.FromHours(1),
                new TRow().GetFields().GenerationKey, () =>
                {
                    return base.GetScript();
                });
        }
        else
        {
            return twoLevelCache.GetLocalStoreOnly(
                $"MultiTenantLookup:{this.ScriptName}:{0}",
                TimeSpan.FromHours(1),
                new TRow().GetFields().GenerationKey, () =>
                {
                    return base.GetScript();
                });
        }
    }
}