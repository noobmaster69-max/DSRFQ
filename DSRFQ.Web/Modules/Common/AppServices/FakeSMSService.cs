using Microsoft.AspNetCore.Hosting;
using System.IO;

namespace DSRFQ.AppServices;
public class FakeSMSService(IWebHostEnvironment hostEnvironment) : ISMSService
{
    private IWebHostEnvironment HostEnvironment { get; } = hostEnvironment ??
        throw new ArgumentNullException(nameof(hostEnvironment));

    public void Send(string phoneNumber, string text, string reason)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber))
            throw new ArgumentNullException(nameof(phoneNumber));

        var path = Path.Combine(HostEnvironment.ContentRootPath, "App_Data", "SMS");
        Directory.CreateDirectory(path);

        var fileName = Path.Combine(path, phoneNumber + ".txt");
        File.AppendAllLines(fileName, [
            DateTime.Now.ToString("yyyy/MM/dd HH:mm:ss", CultureInfo.InvariantCulture) + ": " +
            text,
            ""
        ]);
    }
}