using DSRFQ.Modules.Common.General;
using DSRFQ.SignalR;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Serenity.Extensions.DependencyInjection;
using Stripe;

namespace DSRFQ;
public partial class Startup
{
    public Startup(IConfiguration configuration, IWebHostEnvironment hostEnvironment)
    {
        Configuration = configuration;
        HostEnvironment = hostEnvironment;
        RegisterDataProviders();
        AppConfigHelper.Initialize(configuration);
    }

    public IConfiguration Configuration { get; }
    public IWebHostEnvironment HostEnvironment { get; }

    public void ConfigureServices(IServiceCollection services)
    {
        services.AddExceptionLogger(Configuration.GetDataConnectionString("Default"));
        services.AddApplicationPartsFeatureToggles(Configuration);
        services.AddApplicationPartsTypeSource();
        services.ConfigureSections(Configuration);

        services.Configure<RequestLocalizationOptions>(options =>
        {
            options.SupportedUICultures = AppServices.UserCultureProvider.SupportedCultures;
            options.SupportedCultures = AppServices.UserCultureProvider.SupportedCultures;
            options.RequestCultureProviders.Insert(Math.Max(options.RequestCultureProviders.Count - 1, 0),
                new AppServices.UserCultureProvider()); // insert it before AcceptLanguage header provider
        });

        var dataProtectionKeysFolder = Configuration["DataProtectionKeysFolder"];
        if (!string.IsNullOrEmpty(dataProtectionKeysFolder))
        {
            dataProtectionKeysFolder = System.IO.Path.Combine(HostEnvironment.ContentRootPath, dataProtectionKeysFolder);
            if (System.IO.Directory.Exists(dataProtectionKeysFolder))
                services.AddDataProtection()
                    .PersistKeysToFileSystem(new System.IO.DirectoryInfo(dataProtectionKeysFolder));
        }

        if (Configuration.GetValue<bool>("UseForwardedHeaders"))
        {
            services.Configure<ForwardedHeadersOptions>(options => options.ForwardedHeaders =
                ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto);
        }

        services.AddAntiforgery(options => options.HeaderName = "X-CSRF-TOKEN");
        services.Configure<KestrelServerOptions>(options => options.AllowSynchronousIO = true);
        services.Configure<IISServerOptions>(options => options.AllowSynchronousIO = true);
        services.Configure<JsonOptions>(options => JSON.Defaults.Populate(options.JsonSerializerOptions));

        var builder = services.AddControllersWithViews(options =>
        {
            options.Filters.Add(typeof(AutoValidateAntiforgeryIgnoreBearerAttribute));
            options.Filters.Add(typeof(AntiforgeryCookieResultFilterAttribute));
            options.Conventions.Add(new ServiceEndpointActionModelConvention());
            options.ModelMetadataDetailsProviders.Add(new ServiceEndpointBindingMetadataProvider());
        });

        services.AddAuthentication(o =>
        {
            o.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
            o.DefaultAuthenticateScheme = CookieAuthenticationDefaults.AuthenticationScheme;
            o.DefaultChallengeScheme = CookieAuthenticationDefaults.AuthenticationScheme;
        }).AddCookie(o =>
        {
            o.Cookie.Name = ".AspNetAuth";
            o.LoginPath = new PathString("/Account/Login/");
            o.AccessDeniedPath = new PathString("/Account/AccessDenied");
            o.ExpireTimeSpan = TimeSpan.FromMinutes(30);
            o.SlidingExpiration = true;
        });

        services.AddLogging(loggingBuilder =>
        {
            loggingBuilder.AddConfiguration(Configuration.GetSection("Logging"));
            loggingBuilder.AddConsole();
            loggingBuilder.AddDebug();
        });

        services.AddSingleton<IBackgroundJobManager, BackgroundJobManager>();
        services.AddSingleton<IDataMigrations, AppServices.DataMigrations>();
        services.AddSingleton<IElevationHandler, DefaultElevationHandler>();
        services.AddSingleton<IEmailSender, EmailSender>();
        services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
        services.AddSingleton<IHttpContextItemsAccessor, HttpContextItemsAccessor>();
        services.AddSingleton<INavigationModelFactory, AppServices.NavigationModelFactory>();
        services.AddSingleton<IPasswordStrengthValidator, PasswordStrengthValidator>();
        services.AddSingleton<IPermissionKeyLister, AppServices.PermissionKeyLister>();
        services.AddSingleton<IRolePermissionService, AppServices.RolePermissionService>();
        services.AddSingleton<ISMSService, AppServices.FakeSMSService>();
        services.AddSingleton<IUploadAVScanner, ClamAVUploadScanner>();
        services.AddSingleton<IUserPasswordValidator, AppServices.UserPasswordValidator>();
        services.AddSingleton<IUserClaimCreator, AppServices.CompanyUserClaimCreator>();

        services.AddUserProvider<AppServices.UserAccessor, AppServices.UserRetrieveService>();
        services.AddServiceHandlers();
        services.AddLocalTextInitializer();
        services.AddAITextTranslation(Configuration);
        services.AddDynamicScripts();
        services.AddCssBundling();
        services.AddScriptBundling();
        services.AddUploadStorage();
        services.AddPuppeteerHtmlToPdf();
        services.AddReporting();
        services.AddTwoFactorAuth();
        services.AddSignalR();
        var openIdSection = Configuration.GetSection(Serenity.Pro.OpenIddict.OpenIdSettings.SectionKey);
        var openIdSettings = openIdSection.Get<Serenity.Pro.OpenIddict.OpenIdSettings>() ?? new();
        if (openIdSettings.EnableServer)
        {
            services.AddOpenIddictLocalServerWithDefaults(settings: openIdSettings);
            services.AddSingletonWrapped<IPermissionService, Serenity.Pro.OpenIddict.OpenIdScopePermissionWrapper, AppServices.PermissionService>();
        }
        services.TryAddSingleton<IPermissionService, AppServices.PermissionService>();
        services.AddScoped<IPdfProcessor, PdfProcessor>();

    }

    public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
    {
        RowFieldsProvider.SetDefaultFrom(app.ApplicationServices);
        app.InitializeLocalTexts();

        var startNodeScripts = Configuration["StartNodeScripts"];
        if (!string.IsNullOrEmpty(startNodeScripts))
        {
            foreach (var script in startNodeScripts.Split(';', StringSplitOptions.RemoveEmptyEntries))
            {
                app.StartNodeScript(script);
            }
        }

        app.UseRequestLocalization();

        if (Configuration.GetValue<bool>("UseForwardedHeaders"))
            app.UseForwardedHeaders();

        if (env.IsDevelopment())
        {
            app.UseDeveloperExceptionPage();
        }
        else
        {
            app.UseExceptionHandler("/Home/Error");
            app.UseHsts();
        }

        if (!string.IsNullOrEmpty(Configuration["UsePathBase"]))
            app.UsePathBase(Configuration["UsePathBase"]);

        app.UseHttpsRedirection();
        app.UseExceptionLogger();

        if (!env.IsDevelopment())
            app.UseSourceMapSecurity(new() { SkipPermission = Configuration["SourceMapSkipPermission"] });

        app.UseStaticFiles();
        app.UseRouting();
        app.UseAuthentication();
        var openIdSettings = app.ApplicationServices.GetService<IOptions<Serenity.Pro.OpenIddict.OpenIdSettings>>().Value;
        if (openIdSettings.EnableServer)
            app.UseOpenIddictSchemeFor("^/(DynamicData|(Services/(WorkLog)))/");
        app.UseAuthorization();
        ConfigureTestPipeline?.Invoke(app);
        app.UseDynamicScripts();
        app.UseEndpoints(endpoints =>
        {
            endpoints.MapHub<ChatHub>("/chatHub");
            endpoints.MapControllers();
        });
        app.ApplicationServices.GetRequiredService<IDataMigrations>().Initialize();
        app.UseBackgroundJob<Serenity.Pro.EmailQueue.EmailQueueJob>();
        
    }

    public static Action<IApplicationBuilder> ConfigureTestPipeline { get; set; }

    public static void RegisterDataProviders()
    {
        DbProviderFactories.RegisterFactory("System.Data.SqlClient", SqlClientFactory.Instance);
        DbProviderFactories.RegisterFactory("Microsoft.Data.SqlClient", SqlClientFactory.Instance);

        // to enable SQLITE: add Microsoft.Data.Sqlite reference, set connections, and uncomment line below
        // DbProviderFactories.RegisterFactory("Microsoft.Data.Sqlite", Microsoft.Data.Sqlite.SqliteFactory.Instance);

        // to enable FIREBIRD: add FirebirdSql.Data.FirebirdClient reference, set connections, and uncomment line below
        // DbProviderFactories.RegisterFactory("FirebirdSql.Data.FirebirdClient", FirebirdSql.Data.FirebirdClient.FirebirdClientFactory.Instance);

        // to enable MYSQL: add MySqlConnector reference, set connections, and uncomment line below
        // DbProviderFactories.RegisterFactory("MySql.Data.MySqlClient", MySqlConnector.MySqlConnectorFactory.Instance);

        // to enable POSTGRES: add Npgsql reference, set connections, and uncomment line below
        // DbProviderFactories.RegisterFactory("Npgsql", Npgsql.NpgsqlFactory.Instance);

        // to enable ORACLE: add Oracle.ManagedDataAccess.Core reference, set connections, and uncomment line below
        // DbProviderFactories.RegisterFactory("Oracle.ManagedDataAccess.Client", Oracle.ManagedDataAccess.Client.OracleClientFactory.Instance);
    }
}
