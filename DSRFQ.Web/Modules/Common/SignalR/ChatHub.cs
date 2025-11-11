using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace DSRFQ.SignalR;

public class ChatHub : Hub
{
    public async Task SendMessage(string user, string message)
    {
        await Clients.All.SendAsync("ReceiveMessage", user, message);
    }
    public async Task SendChangeInStatus(object data)
    {
        await Clients.All.SendAsync("ChangeInStatus", data);
            
    }
    public async Task SendChangeInMessage(object data)
    {
        await Clients.All.SendAsync("ChangeInMessage", data);
            
    }
}