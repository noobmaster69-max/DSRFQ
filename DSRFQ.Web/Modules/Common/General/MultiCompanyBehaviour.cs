using DSRFQ.AppServices;
using DSRFQ.Web.Modules;
using Serenity;
using Serenity.Data;
using Serenity.Services;

namespace DSRFQ.Administration;

public class MultiTCompanyBehavior : IImplicitBehavior,
    ISaveBehavior, IDeleteBehavior,
    IListBehavior, IRetrieveBehavior
{
    private Int32Field companyIdField;
    private Int32Field groupIdField;

    public bool ActivateFor(IRow row)
    {
        if (row is not IMultiCompanyRow mtRow)
            return false;

        companyIdField = mtRow.CompanyIdField;
        groupIdField = mtRow.GroupIdField;
        return true;
    }

    public void OnPrepareQuery(IRetrieveRequestHandler handler,
        SqlQuery query)
    {
        
        if (!handler.Context.Permissions.HasPermission(PermissionKeys.Company))
            if(handler.Context.User.GetCompanyId()!=null)
                query.Where((new Criteria(companyIdField) == handler.Context.User.GetCompanyId().Value && new Criteria(companyIdField).IsNotNull()) | new Criteria(companyIdField).IsNull());
    }

    public void OnPrepareQuery(IListRequestHandler handler,
        SqlQuery query)
    {

        if (!handler.Context.Permissions.HasPermission(PermissionKeys.Company))
        {
            if (handler.Context.User.GetCompanyId() != null)
            {
                //Got company
                //query.Where((new Criteria(companyIdField) == handler.Context.User.GetCompanyId().Value && new Criteria(companyIdField).IsNotNull()) | new Criteria(companyIdField).IsNull());
                query.Where((new Criteria(companyIdField) == handler.Context.User.GetCompanyId().Value));

            }
            else
            {
                //Group Level Admin
                if (handler.Context.User.GetGroupId() != null)
                {

                    query.Where((new Criteria(groupIdField) == handler.Context.User.GetGroupId().Value ));


                }
            }
        }
        else
        {
            if(!handler.Context.Permissions.HasPermission(PermissionKeys.Group)){
            
                //Group Level Admin
                if (handler.Context.User.GetGroupId() != null)
                {

                    query.Where((new Criteria(groupIdField) == handler.Context.User.GetGroupId().Value));


                }
            }
            
        }
            
        
            // if(handler.Context.User.GetCompanyId()!=null)
            //     query.Where((new Criteria(companyIdField) == handler.Context.User.GetCompanyId().Value && new Criteria(companyIdField).IsNotNull()) | new Criteria(companyIdField).IsNull());
            //
            
    }

    public void OnSetInternalFields(ISaveRequestHandler handler)
    {
        if (handler.IsCreate)
        {
            if (handler.Context.User.GetCompanyId() != null)
            {
                companyIdField[handler.Row] = handler.Context.User.GetCompanyId().Value;
            }
            if (handler.Context.User.GetGroupId() != null)
            {
                groupIdField[handler.Row] = handler.Context.User.GetGroupId().Value;
            }
            
        }
            
                
    }

    public void OnValidateRequest(ISaveRequestHandler handler)
    {
        if (handler.IsUpdate)
        {
            if (companyIdField[handler.Old] != companyIdField[handler.Row])
                handler.Context.Permissions.ValidatePermission(PermissionKeys.Company, handler.Context.Localizer);
        }
    }

    public void OnValidateRequest(IDeleteRequestHandler handler)
    {
        if (handler.Context.User.GetCompanyId() != null)
        {
            if (companyIdField[handler.Row] != handler.Context.User.GetCompanyId())
                        handler.Context.Permissions.ValidatePermission(PermissionKeys.Company, handler.Context.Localizer);
        }
        
    }

    public void OnAfterDelete(IDeleteRequestHandler handler) { }
    public void OnAfterExecuteQuery(IRetrieveRequestHandler handler) { }
    public void OnAfterExecuteQuery(IListRequestHandler handler) { }
    public void OnAfterSave(ISaveRequestHandler handler) { }
    public void OnApplyFilters(IListRequestHandler handler, SqlQuery query) { }
    public void OnAudit(IDeleteRequestHandler handler) { }
    public void OnAudit(ISaveRequestHandler handler) { }
    public void OnBeforeDelete(IDeleteRequestHandler handler) { }
    public void OnBeforeExecuteQuery(IRetrieveRequestHandler handler) { }
    public void OnBeforeExecuteQuery(IListRequestHandler handler) { }
    public void OnBeforeSave(ISaveRequestHandler handler) { }
    public void OnPrepareQuery(IDeleteRequestHandler handler, SqlQuery query) { }
    public void OnPrepareQuery(ISaveRequestHandler handler, SqlQuery query) { }
    public void OnReturn(IDeleteRequestHandler handler) { }
    public void OnReturn(IRetrieveRequestHandler handler) { }
    public void OnReturn(IListRequestHandler handler) { }
    public void OnReturn(ISaveRequestHandler handler) { }
    public void OnValidateRequest(IRetrieveRequestHandler handler) { }
    public void OnValidateRequest(IListRequestHandler handler) { }
}