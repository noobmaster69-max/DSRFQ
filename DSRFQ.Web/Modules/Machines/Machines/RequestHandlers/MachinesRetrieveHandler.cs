using Serenity.Services;
using MyRequest = Serenity.Services.RetrieveRequest;
using MyResponse = Serenity.Services.RetrieveResponse<DSRFQ.Machines.MachinesRow>;
using MyRow = DSRFQ.Machines.MachinesRow;

namespace DSRFQ.Machines;

public interface IMachinesRetrieveHandler : IRetrieveHandler<MyRow, MyRequest, MyResponse> { }

public class MachinesRetrieveHandler : RetrieveRequestHandler<MyRow, MyRequest, MyResponse>, IMachinesRetrieveHandler
{
    public MachinesRetrieveHandler(IRequestContext context)
            : base(context)
    {
    }
}