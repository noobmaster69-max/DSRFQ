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
    /// <remarks>
    /// The part is queued before the message is published, so it appears on the
    /// Processing Queue page the moment the upload dialog closes -- including
    /// when the consumer is down and nothing will pick the message up. Uploading
    /// ten drawings therefore produces ten queued jobs that run one at a time
    /// rather than ten conversions at once, which is what used to exhaust the
    /// box's memory.
    /// </remarks>
    [HttpPost,Route("/UploadDrawing")]
    public IActionResult SendMessage(IUnitOfWork uow, [FromBody] MessageModel message)
    {
        // 127.0.0.1, not "localhost" - see RabbitMqConnection.
        var factory = RabbitMqConnection.Factory();
        Console.WriteLine($" Received '{message}'");

        // Only the stages the uploader ticked. The first one they asked for is
        // what gets queued; the consumer hands on from there and skips the rest
        // by reading the same list. Null (anything created outside the upload
        // dialog) means all three, which is what this always used to do.
        var queue = "NewCostingParts";
        if (int.TryParse(message?.Message, NumberStyles.Integer,
                CultureInfo.InvariantCulture, out var costingPartId))
        {
            var fld = DSRFQ.Costing.CostingPartsRow.Fields;
            var part = uow.Connection.TryById<DSRFQ.Costing.CostingPartsRow>(costingPartId);
            var requested = (part?.RequestedStages ?? "").Trim();
            var stages = requested.Length == 0
                ? new[] { "drawing", "costing", "ballooning" }
                : requested.ToLowerInvariant().Split(',', StringSplitOptions.RemoveEmptyEntries |
                                                          StringSplitOptions.TrimEntries);

            bool Wants(string stage) => Array.IndexOf(stages, stage) >= 0;

            // A stage nobody asked for is marked Skipped rather than left
            // Pending: the grid should not show work that will never start, and
            // the consumer's own "is this stage still outstanding" checks read
            // these columns too.
            var skipped = new List<Field>();
            if (!Wants("drawing")) { skipped.Add(fld.DrawingConversionStatusId); skipped.Add(fld.OcrStatusId); }
            if (!Wants("costing")) skipped.Add(fld.CostingStatusId);
            if (!Wants("ballooning")) skipped.Add(fld.BalloonStatusId);
            if (skipped.Count > 0)
            {
                var update = new SqlUpdate(fld.TableName).Where(fld.Id == costingPartId);
                foreach (var f in skipped)
                    update.Set(f, StageSkipped);
                update.Execute(uow.Connection);
            }

            queue = Wants("drawing") ? "NewCostingParts"
                  : Wants("costing") ? "Costing"
                  : Wants("ballooning") ? "Ballooning"
                  : null;

            if (queue == null)
                return Ok(" [x] Nothing to run - no stage was selected");

            DSRFQ.Costing.CostingQueue.Enqueue(uow.Connection, costingPartId, queue);
        }

        using (var connection = factory.CreateConnection())
        using (var channel = connection.CreateModel())
        {
            // Straight to the queue the consumer listens on (the default
            // exchange routes by queue name), as the Re-run button does. The
            // costing_part_exchange binding only ever carried NewCostingParts,
            // so it cannot reach the other two.
            channel.QueueDeclare(queue: queue,
                durable: true,
                exclusive: false,
                autoDelete: false,
                arguments: null);

            var body = Encoding.UTF8.GetBytes(message.Message);
            channel.BasicPublish(exchange: "",
                routingKey: queue,
                basicProperties: null,
                body: body);
            return Ok($" [x] Sent '{message.Message}' to {queue}");
        }
    }

    /// <summary>MasterCostingStatus "Skipped" - the stage was not asked for.</summary>
    private const int StageSkipped = 7;
}