using Serenity.Services;
using MyRequest = Serenity.Services.SaveRequest<DSRFQ.Company.CompanyGroupsRow>;
using MyResponse = Serenity.Services.SaveResponse;
using MyRow = DSRFQ.Company.CompanyGroupsRow;

namespace DSRFQ.Company;

public interface ICompanyGroupsSaveHandler : ISaveHandler<MyRow, MyRequest, MyResponse> { }

public class CompanyGroupsSaveHandler : SaveRequestHandler<MyRow, MyRequest, MyResponse>, ICompanyGroupsSaveHandler
{
    public CompanyGroupsSaveHandler(IRequestContext context)
            : base(context)
    {
    }
}