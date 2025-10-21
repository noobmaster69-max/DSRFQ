using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Company.CompaniesRow>;
using MyRow = DSRFQ.Company.CompaniesRow;

namespace DSRFQ.Company;

public interface ICompaniesListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class CompaniesListHandler : ListRequestHandler<MyRow, MyRequest, MyResponse>, ICompaniesListHandler
{
    public CompaniesListHandler(IRequestContext context)
            : base(context)
    {
    }
}