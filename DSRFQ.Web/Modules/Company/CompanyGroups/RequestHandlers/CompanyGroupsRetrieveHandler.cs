using Serenity.Services;
using MyRequest = Serenity.Services.RetrieveRequest;
using MyResponse = Serenity.Services.RetrieveResponse<DSRFQ.Company.CompanyGroupsRow>;
using MyRow = DSRFQ.Company.CompanyGroupsRow;

namespace DSRFQ.Company;

public interface ICompanyGroupsRetrieveHandler : IRetrieveHandler<MyRow, MyRequest, MyResponse> { }

public class CompanyGroupsRetrieveHandler : RetrieveRequestHandler<MyRow, MyRequest, MyResponse>, ICompanyGroupsRetrieveHandler
{
    public CompanyGroupsRetrieveHandler(IRequestContext context)
            : base(context)
    {
    }
}