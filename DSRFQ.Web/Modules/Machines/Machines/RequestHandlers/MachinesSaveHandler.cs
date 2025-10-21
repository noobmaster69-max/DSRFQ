using Serenity.Services;
using MyRequest = Serenity.Services.SaveRequest<DSRFQ.Machines.MachinesRow>;
using MyResponse = Serenity.Services.SaveResponse;
using MyRow = DSRFQ.Machines.MachinesRow;

namespace DSRFQ.Machines;

public interface IMachinesSaveHandler : ISaveHandler<MyRow, MyRequest, MyResponse> { }

public class MachinesSaveHandler : SaveRequestHandler<MyRow, MyRequest, MyResponse>, IMachinesSaveHandler
{
    public MachinesSaveHandler(IRequestContext context)
            : base(context)
    {
    }
}