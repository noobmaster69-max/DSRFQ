using FluentMigrator;

namespace DSRFQ.Migrations.DefaultDB;
[DefaultDB, MigrationKey(20240930_1359)]
public class DefaultDB_20240930_1359_TwoFactorData : Migration
{
    public override void Up()
    {
        Alter.Table("Users")
            .AddColumn("TwoFactorData").AsString(int.MaxValue).Nullable();

        var emailConcat = new ConcatAttribute(
            @"'{""Preferred2FAType"":""Email"",""Configured2FATypes"":[""Email""],""ConfiguredEmail"":""'",
            @"[Email]",
            @"'""}'");

        var smsConcat = new ConcatAttribute(
            @"'{""Preferred2FAType"":""SMS"",""Configured2FATypes"":[""SMS""],""ConfiguredMobileNumber"":""'",
            @"[MobilePhoneNumber]",
            @"'""}'");

        ISqlDialect dialect = SqlSettings.DefaultDialect;
        IfDatabase(x =>
        {
            if (x.StartsWith("SqlServer", StringComparison.OrdinalIgnoreCase))
                dialect = SqlServer2000Dialect.Instance;
            else if (x.StartsWith("Firebird", StringComparison.OrdinalIgnoreCase))
                dialect = FirebirdDialect.Instance;
            else if (x.StartsWith("Sqlite", StringComparison.OrdinalIgnoreCase))
                dialect = SqliteDialect.Instance;
            else if (x.StartsWith("Postgres", StringComparison.OrdinalIgnoreCase))
                dialect = PostgresDialect.Instance;
            else if (x.StartsWith("MySql", StringComparison.OrdinalIgnoreCase))
                dialect = MySqlDialect.Instance;
            else
                dialect = OracleDialect.Instance; // CONCAT two params only

            return true;
        });

        if (!this.IsOracle())
        {

            Execute.Sql(BracketLocator.ReplaceBrackets(new SqlUpdate("[Users]")
                .Dialect(dialect)
                .SetTo("[TwoFactorData]", emailConcat.ToString(dialect))
                .Where("[TwoFactorAuth] = 1" +
                    " AND [Email] is not null" +
                    " AND [Email] not like '%\"%'").ToString(), dialect));

            Execute.Sql(BracketLocator.ReplaceBrackets(new SqlUpdate("[Users]")
                .SetTo("[TwoFactorData]", smsConcat.ToString(dialect))
                .Where("[TwoFactorAuth] = 2" +
                    " AND [MobilePhoneNumber] is not null" +
                    " AND [MobilePhoneNumber] != ''" +
                    " AND [MobilePhoneNumber] not like '%\"%'").ToString(), dialect));
        }

        Delete.Column("TwoFactorAuth").FromTable("Users");
        Delete.Column("MobilePhoneVerified").FromTable("Users");
    }

    public override void Down()
    {
    }
}
