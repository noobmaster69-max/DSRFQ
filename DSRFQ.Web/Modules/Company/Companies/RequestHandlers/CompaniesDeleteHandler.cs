using Serenity.Services;
using MyRequest = Serenity.Services.DeleteRequest;
using MyResponse = Serenity.Services.DeleteResponse;
using MyRow = DSRFQ.Company.CompaniesRow;

namespace DSRFQ.Company;

public interface ICompaniesDeleteHandler : IDeleteHandler<MyRow, MyRequest, MyResponse> { }

public class CompaniesDeleteHandler : DeleteRequestHandler<MyRow, MyRequest, MyResponse>, ICompaniesDeleteHandler
{
    public CompaniesDeleteHandler(IRequestContext context)
            : base(context)
    {
    }
}