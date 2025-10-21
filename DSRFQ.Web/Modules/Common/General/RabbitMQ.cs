using RabbitMQ.Client;
using System.Text;

namespace DSRFQ.Modules.Common.General;

[ConnectionKey("Default"), ServiceAuthorize("*")]

public class RabbitMQ : ServiceEndpoint
{
    // public class MessageModel
    // {
    //     public string Message { get; set; }
    // }
    // [HttpPost,Route("/UploadDrawing")]
    // public void SendMessage([FromBody] MessageModel message)
    // {
    //     var factory = new ConnectionFactory() { HostName = "localhost" }; 
    //     Console.WriteLine($" Received '{message}'");
    //     using (var connection = factory.CreateConnection())
    //     using (var channel = connection.CreateModel())
    //     {
    //         channel.ExchangeDeclare(exchange: "costing_part_exchange", type: ExchangeType.Direct);
    //
    //         // 3. Declare a queue for our messages
    //         channel.QueueDeclare(queue: "NewCostingParts",
    //             durable: true,
    //             exclusive: false,
    //             autoDelete: false,
    //             arguments: null);
    //
    //         // 4. Bind the queue to the exchange with a routing key
    //         channel.QueueBind(queue: "NewCostingParts",
    //             exchange: "costing_part_exchange",
    //             routingKey: "new_costing_part_key");
    //
    //         // 5. Publish the message
    //         var body = Encoding.UTF8.GetBytes(message.Message);
    //         channel.BasicPublish(exchange: "costing_part_exchange",
    //             routingKey: "new_costing_part_key",
    //             basicProperties: null,
    //             body: body);
    //
    //         Console.WriteLine($" [x] Sent '{message.Message}'");
    //     }
    // }
}