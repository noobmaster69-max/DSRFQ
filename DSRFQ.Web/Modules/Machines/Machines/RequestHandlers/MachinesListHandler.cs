using Serenity.Services;
using MyRequest = Serenity.Services.ListRequest;
using MyResponse = Serenity.Services.ListResponse<DSRFQ.Machines.MachinesRow>;
using MyRow = DSRFQ.Machines.MachinesRow;

namespace DSRFQ.Machines;

public interface IMachinesListHandler : IListHandler<MyRow, MyRequest, MyResponse> { }

public class MachinesListHandler : ListRequestHandler<MyRow, MyRequest, MyResponse>, IMachinesListHandler
{
    public MachinesListHandler(IRequestContext context)
            : base(context)
    {
    }
}