using Serenity.Services;
using MyRequest = Serenity.Services.RetrieveRequest;
using MyResponse = Serenity.Services.RetrieveResponse<DSRFQ.Company.CompaniesRow>;
using MyRow = DSRFQ.Company.CompaniesRow;

namespace DSRFQ.Company;

public interface ICompaniesRetrieveHandler : IRetrieveHandler<MyRow, MyRequest, MyResponse> { }

public class CompaniesRetrieveHandler : RetrieveRequestHandler<MyRow, MyRequest, MyResponse>, ICompaniesRetrieveHandler
{
    public CompaniesRetrieveHandler(IRequestContext context)
            : base(context)
    {
    }
}