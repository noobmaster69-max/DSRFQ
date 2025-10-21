using Serenity.Services;
using MyRequest = Serenity.Services.DeleteRequest;
using MyResponse = Serenity.Services.DeleteResponse;
using MyRow = DSRFQ.Costing.CostingPartsRow;

namespace DSRFQ.Costing;

public interface ICostingPartsDeleteHandler : IDeleteHandler<MyRow, MyRequest, MyResponse> { }

public class CostingPartsDeleteHandler : DeleteRequestHandler<MyRow, MyRequest, MyResponse>, ICostingPartsDeleteHandler
{
    public CostingPartsDeleteHandler(IRequestContext context)
            : base(context)
    {
    }
}