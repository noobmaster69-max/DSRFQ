using Microsoft.AspNetCore.SignalR;
using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Serenity.Data;
using Serenity.Services;
using Serenity.Extensions;
using Microsoft.Extensions.DependencyInjection;

namespace DSRFQ.Web.Hubs
{
    public class ChatHub : Hub
    {
        public async Task SendMessage(string senderId, string message, int chatId, int messageId)
        {
            await Clients.Group($"chat_{chatId}").SendAsync("ReceiveMessage", senderId, message, messageId);
        }

        public async Task JoinGroup(string groupName)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        }

        public async Task LeaveGroup(string groupName)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        }

        public override async Task OnConnectedAsync()
        {
            await Clients.Caller.SendAsync("ReceiveMessage", "System", "Connected to chat");
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(System.Exception exception)
        {
            await base.OnDisconnectedAsync(exception);
        }
        [HttpPost("ChangeInStatus")]
        public async Task SendChangeInStatus(object data)
        {
            await Clients.All.SendAsync("ChangeInStatus", data);
            
        }
    }
}