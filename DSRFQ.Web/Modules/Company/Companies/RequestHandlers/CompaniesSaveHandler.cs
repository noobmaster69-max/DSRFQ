using Serenity.Services;
using MyRequest = Serenity.Services.SaveRequest<DSRFQ.Company.CompaniesRow>;
using MyResponse = Serenity.Services.SaveResponse;
using MyRow = DSRFQ.Company.CompaniesRow;

namespace DSRFQ.Company;

public interface ICompaniesSaveHandler : ISaveHandler<MyRow, MyRequest, MyResponse> { }

public class CompaniesSaveHandler : SaveRequestHandler<MyRow, MyRequest, MyResponse>, ICompaniesSaveHandler
{
    public CompaniesSaveHandler(IRequestContext context)
            : base(context)
    {
    }
}