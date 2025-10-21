using Serenity.Services;
using MyRequest = Serenity.Services.DeleteRequest;
using MyResponse = Serenity.Services.DeleteResponse;
using MyRow = DSRFQ.Company.CompanyGroupsRow;

namespace DSRFQ.Company;

public interface ICompanyGroupsDeleteHandler : IDeleteHandler<MyRow, MyRequest, MyResponse> { }

public class CompanyGroupsDeleteHandler : DeleteRequestHandler<MyRow, MyRequest, MyResponse>, ICompanyGroupsDeleteHandler
{
    public CompanyGroupsDeleteHandler(IRequestContext context)
            : base(context)
    {
    }
}