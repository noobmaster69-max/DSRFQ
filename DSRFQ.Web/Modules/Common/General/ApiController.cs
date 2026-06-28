using System.Data;
using DSRFQ.Administration;
using DSRFQ.Company;
using System.Collections.Generic;
using System.IO;
using DSRFQ.Common;
using DSRFQ.Wallet;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using RabbitMQ.Client;
using Stripe;
using Stripe.Checkout;

namespace DSRFQ.Modules.Common.General;

[Route("Services/Common/General/[action]")]
[ConnectionKey("Default"), ServiceAuthorize("*")]

public class ApiController : ServiceEndpoint
{
    protected IUserAccessor UserAccessor { get; }
    public int userId { get; }

    public ApiController(IUserAccessor userAccessor)
    {

        UserAccessor = userAccessor ?? throw new ArgumentNullException(nameof(userAccessor));
        userId = Convert.ToInt32(UserAccessor.User.GetIdentifier(), CultureInfo.InvariantCulture);

    }

    public class OrganizationModel
    {
        public string OrganizationName { get; set; }
        public string OrganizationId { get; set; }
        public int CompanyId { get; set; }
    }

    [HttpPost, Route("/CreateOrganization")]
    public IActionResult CreateOrganization(IUnitOfWork uow, [FromBody] OrganizationModel wrapper)
    {
        var errorList = new List<string>();
        try
        {
            var companyId = uow.Connection.InsertAndGetID(new CompaniesRow
            {
                Name = wrapper.OrganizationName,
                OrganizationId = wrapper.OrganizationId,
                InsertUserId = userId,
                InsertDate = DateTime.Now,
                IsActive = 1
            });
            uow.Connection.UpdateById(new UserRow
            {
                UserId = userId,
                CompanyId = Convert.ToInt32(companyId.Value)
            });
            return StatusCode(200, "Success");
        }
        catch (Exception ex)
        {
            errorList.Add(ex.Message);
            return StatusCode(500, errorList);
        }
    }

    [HttpPost, Route("/FetchCompanyDetail")]
    public IActionResult  FetchCompanyDetail([FromServices] IUnitOfWork uow)
    {
        using (var connection = uow.Connection)
        {
            var sql =
                @"SELECT b.ID as Id,b.Name as Name,b.OrganizationID as OrganizationId FROM dbo.Users as a INNER JOIN dbo.Companies as b ON b.ID = a.CompanyID WHERE a.UserID = @userId";
            var x = connection.Query<CompaniesRow>(sql,
                param:new
                {
                    userId = userId
                },
                commandType: CommandType.Text).FirstOrDefault();
            return new JsonResult(x ?? new CompaniesRow());;
        }
    }
    
    [HttpPost, Route("/FetchCompanyUser")]
    public List<UserRow>  FetchCompanyUser([FromServices] IUnitOfWork uow,[FromBody] OrganizationModel wrapper)
    {
        var x = new List<UserRow>();
        using (var connection = uow.Connection)
        {
            var sql =
                @"SELECT UserId,DisplayName,Email,Username,UserImage FROM dbo.Users WHERE CompanyID = @companyId";
             x = (List<UserRow>) connection.Query<UserRow>(sql,
                param:new
                {
                    companyId = wrapper.CompanyId
                },
                commandType: CommandType.Text);
            return x;
        }
    }
    [HttpPost, Route("/FetchBalance")]
    public List<decimal>  FetchBalance([FromServices] IUnitOfWork uow)
    {
        var x = new List<decimal>();
        using (var connection = uow.Connection)
        {
          ;
            x = (List<decimal>) connection.Query<decimal>("dbo.Wallet_FetchBalance",
                param:new
                {
                    UserId = userId
                },
                commandType: CommandType.StoredProcedure);
            return x;
        }
    }
    [HttpPost, Route("/FetchBillingHistory")]
    public List<BillingHistoryModel>  FetchBillingHistory([FromServices] IUnitOfWork uow)
    {
        var x = new List<BillingHistoryModel>();
        using (var connection = uow.Connection)
        {
            x = (List<BillingHistoryModel>) connection.Query<BillingHistoryModel>("dbo.Wallet_FetchTransactionHistory",
                param:new
                {
                    userId = userId
                },
                commandType: CommandType.StoredProcedure);
            return x;
        }
    }
    [HttpPost,Route("/uploadFileEndpoint"),ServiceAuthorize("*")]
    public async Task<IActionResult> UploadFile()
    {
        try
        {
            var filename = Request.Headers["Filename"].ToString();
            if (string.IsNullOrEmpty(filename))
            {
                return BadRequest("Filename is required");
            }
            var appDataPath = Path.Combine(Directory.GetCurrentDirectory(), "App_Data\\upload");
            // Ensure App_Data directory exists
            if (!Directory.Exists(appDataPath))
            {
                Directory.CreateDirectory(appDataPath);
            }
            var fullPath = Path.Combine(appDataPath, filename);
         
            var directory = Path.GetDirectoryName(fullPath);
            if (!Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }
            var extension = Path.GetExtension(fullPath);
            
            var uid = Guid.NewGuid().ToString("N"); // e.g., "9d895889dce14fa08bce0337a30753be"
            var newFilename = $"{uid}{extension}";
            newFilename = Path.GetFileName(filename);

            fullPath = Path.Combine(directory!, newFilename);

            // Update the relative return path (preserving subfolder structure)
            var relativeFolder = Path.GetDirectoryName(filename)!.Replace("\\", "/");
            filename = $"{relativeFolder}/{newFilename}";
            await using (var fileStream = new FileStream(fullPath, FileMode.Create))
            {
                await Request.Body.CopyToAsync(fileStream);
            }
            var uploadedSize = new FileInfo(fullPath).Length;
            if (uploadedSize == 0)
            {
                throw new Exception("File size mismatch after copying.");
            }
            return Ok(new {
                Filename = $"{filename}",        // Relative path used by Serenity
                Message = "File uploaded successfully"
            });
            //return Ok(new { message = "File uploaded successfully", path = filePath });
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }
    [HttpPost,Route("/retrieveFile"),ServiceAuthorize("*")]
    public async Task<IActionResult> RetrieveFile([FromForm] string file)
    {
        try
        {   
            Console.WriteLine("Calling");
            Console.WriteLine(file);
            if (string.IsNullOrEmpty(file))
            {
                return BadRequest("Filename is required");
            }
            var appDataPath = Path.Combine(Directory.GetCurrentDirectory(), "App_Data\\upload");
            // Ensure App_Data directory exists
            if (!Directory.Exists(appDataPath))
            {
                Directory.CreateDirectory(appDataPath);
            }
            var fullPath = Path.Combine(appDataPath, file);
            var filename = Path.GetFileName(file);
            
       
            byte[] fileBytes = await System.IO.File.ReadAllBytesAsync(fullPath);

            return Ok(new
            {
                Filename = filename,
                Bytes = fileBytes,
                Message = "File retrieve successfully"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }
    public class MessageModel
    {
        public string Message { get; set; }
    }
    [HttpPost,Route("/UploadDrawing")]
    public IActionResult SendMessage([FromBody] MessageModel message)
    {
        var factory = new ConnectionFactory() { HostName = "localhost" }; 
        Console.WriteLine($" Received '{message}'");
        using (var connection = factory.CreateConnection())
        using (var channel = connection.CreateModel())
        {
            channel.ExchangeDeclare(exchange: "costing_part_exchange", type: ExchangeType.Direct);

            // 3. Declare a queue for our messages
            channel.QueueDeclare(queue: "NewCostingParts",
                durable: true,
                exclusive: false,
                autoDelete: false,
                arguments: null);

            // 4. Bind the queue to the exchange with a routing key
            channel.QueueBind(queue: "NewCostingParts",
                exchange: "costing_part_exchange",
                routingKey: "new_costing_part_key");

            // 5. Publish the message
            var body = Encoding.UTF8.GetBytes(message.Message);
            channel.BasicPublish(exchange: "costing_part_exchange",
                routingKey: "new_costing_part_key",
                basicProperties: null,
                body: body);
            return Ok($" [x] Sent '{message.Message}'");
        }
    }
}