using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Company.CompanyGroupsRow>;
using MyRow = DSRFQ.Company.CompanyGroupsRow;

namespace DSRFQ.Company;

public interface ICompanyGroupsListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class CompanyGroupsListHandler : ListRequestHandler<MyRow, MyRequest, MyResponse>, ICompanyGroupsListHandler
{
    public CompanyGroupsListHandler(IRequestContext context)
            : base(context)
    {
    }
}