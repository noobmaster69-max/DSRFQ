using Serenity.Services;
using MyRequest = Serenity.Services.DeleteRequest;
using MyResponse = Serenity.Services.DeleteResponse;
using MyRow = DSRFQ.Machines.MachinesRow;

namespace DSRFQ.Machines;

public interface IMachinesDeleteHandler : IDeleteHandler<MyRow, MyRequest, MyResponse> { }

public class MachinesDeleteHandler : DeleteRequestHandler<MyRow, MyRequest, MyResponse>, IMachinesDeleteHandler
{
    public MachinesDeleteHandler(IRequestContext context)
            : base(context)
    {
    }
}