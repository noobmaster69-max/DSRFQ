using FluentMigrator;
using FluentMigrator.Infrastructure;
using FluentMigrator.Runner;
using FluentMigrator.Runner.Conventions;
using FluentMigrator.Runner.Exceptions;
using FluentMigrator.Runner.Infrastructure;
using FluentMigrator.Runner.Initialization;
using FluentMigrator.Runner.Processors;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using System.IO;
using System.Reflection;

namespace DSRFQ.AppServices;
public class DataMigrations(ITypeSource typeSource,
    ISqlConnections sqlConnections,
    IWebHostEnvironment hostEnvironment,
    IFeatureToggles featureToggles = null) : IDataMigrations
{
    private static readonly string[] databaseKeys = [
        "Default"
    ];

    private readonly ITypeSource typeSource = typeSource ?? throw new ArgumentNullException(nameof(typeSource));
    private readonly ISqlConnections sqlConnections = sqlConnections ?? throw new ArgumentNullException(nameof(sqlConnections));
    private readonly IWebHostEnvironment hostEnvironment = hostEnvironment ?? throw new ArgumentNullException(nameof(hostEnvironment));

    public void Initialize()
    {
        foreach (var databaseKey in databaseKeys)
        {
            EnsureDatabase(databaseKey);
            RunMigrations(databaseKey);
        }
    }

    /// <summary>
    /// Automatically creates a database for the template if it doesn't already exists.
    /// You might delete this method to disable auto create functionality.
    /// </summary>
    private void EnsureDatabase(string databaseKey)
    {
        MigrationUtils.EnsureDatabase(databaseKey,
            hostEnvironment.ContentRootPath, sqlConnections);
        Microsoft.Data.SqlClient.SqlConnection.ClearAllPools();
    }

    private void RunMigrations(string databaseKey)
    {
        var cs = sqlConnections.TryGetConnectionString(databaseKey) ??
            throw new ArgumentOutOfRangeException(nameof(databaseKey));
        string serverType = cs.Dialect.ServerType;
        bool isOracle = serverType.StartsWith("Oracle", StringComparison.OrdinalIgnoreCase);
        bool isFirebird = serverType.StartsWith("Firebird", StringComparison.OrdinalIgnoreCase);

        var conventionSet = new DefaultConventionSet(defaultSchemaName: null,
            Path.GetDirectoryName(typeof(DataMigrations).Assembly.Location));

        var serviceProvider = new ServiceCollection()
            .AddLogging(lb => lb.AddFluentMigratorConsole())
            .AddFluentMigratorCore()
            .AddSingleton<IConventionSet>(conventionSet)
            .Configure<ProcessorOptions>(options =>
            {
                options.Timeout = TimeSpan.FromSeconds(90);
            })
            .Configure<RunnerOptions>(options =>
            {
                options.Tags = [databaseKey + "DB"];
                options.IncludeUntaggedMigrations = databaseKey == "Default";
            })
            .ConfigureRunner(builder =>
            {
                if (serverType == OracleDialect.Instance.ServerType)
                    builder.AddOracleManaged();
                else if (serverType == SqliteDialect.Instance.ServerType)
                    builder.AddSQLite();
                else if (serverType == FirebirdDialect.Instance.ServerType)
                    builder.AddFirebird();
                else if (serverType == MySqlDialect.Instance.ServerType)
                    builder.AddMySql5();
                else if (serverType == PostgresDialect.Instance.ServerType)
                    builder.AddPostgres();
                else
                    builder.AddSqlServer();

                builder.WithGlobalConnectionString(cs.ConnectionString);
                builder.ScanIn(((IGetAssemblies)typeSource).GetAssemblies().ToArray()).For.Migrations();
                builder.WithRunnerConventions(new RunnerConventions(featureToggles));
            })
            .BuildServiceProvider();

        var culture = CultureInfo.CurrentCulture;
        try
        {
            if (isFirebird)
                Thread.CurrentThread.CurrentCulture = CultureInfo.InvariantCulture;

            using var scope = serviceProvider.CreateScope();
            var runner = scope.ServiceProvider.GetRequiredService<IMigrationRunner>();
            runner.MigrateUp();
        }
        catch (MissingMigrationsException)
        {
            // ignore "no migrations found", as it is possible that features are disabled
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException("Error executing migration!", ex);
        }
        finally
        {
            if (isFirebird)
                Thread.CurrentThread.CurrentCulture = culture;
        }
    }

    private class RunnerConventions(IFeatureToggles featureToggles) : IMigrationRunnerConventions
    {
        public Func<Type, bool> TypeIsMigration => type =>
            DefaultMigrationRunnerConventions.Instance.TypeIsMigration(type) &&
            (featureToggles == null ||
             type.GetCustomAttribute<RequiresFeatureAttribute>() is not RequiresFeatureAttribute attr ||
             featureToggles.IsEnabled(attr.Features, attr.RequireAny));

        public Func<Type, MigrationStage?> GetMaintenanceStage => DefaultMigrationRunnerConventions.Instance.GetMaintenanceStage;
        [Obsolete]
        public Func<Type, IMigrationInfo> GetMigrationInfo => DefaultMigrationRunnerConventions.Instance.GetMigrationInfo;
        public Func<IMigration, IMigrationInfo> GetMigrationInfoForMigration => DefaultMigrationRunnerConventions.Instance.GetMigrationInfoForMigration;
        public Func<Type, IEnumerable<string>, bool> TypeHasMatchingTags => DefaultMigrationRunnerConventions.Instance.TypeHasMatchingTags;
        public Func<Type, bool> TypeHasTags => DefaultMigrationRunnerConventions.Instance.TypeHasTags;
        public Func<Type, bool> TypeIsProfile => DefaultMigrationRunnerConventions.Instance.TypeIsMigration;
        public Func<Type, bool> TypeIsVersionTableMetaData => DefaultMigrationRunnerConventions.Instance.TypeIsVersionTableMetaData;
    }
}