"""Generate the DSRFQ migration that creates and seeds the feature-symbol tables.

The symbols are single Unicode characters that are easy to mistype and
impossible to eyeball in a diff - the perpendicularity glyph alone has two
near-identical codepoints in common use. So the seed is generated from the rows
in DSEFACTORY rather than transcribed.

    python .mssql-scripts/gen_feature_symbol_migration.py
"""

import os

import pyodbc

OUT = (r"C:\Aizera\DSRFQ\DSRFQ.Web\Migrations\DefaultDB"
       r"\DefaultDB_20260901_1500_FeatureSymbols.cs")

cn = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};SERVER=deskdev,65001;"
    "DATABASE=DSEFACTORY;UID=sa;PWD=Tsh9989;TrustServerCertificate=yes")
cur = cn.cursor()

cats = cur.execute(
    "SELECT Id, Name, Description FROM dbo.MasterFeatureCategories "
    "WHERE ISNULL(IsActive,1) = 1 ORDER BY Id").fetchall()
syms = cur.execute(
    "SELECT Id, FeatureCategoryID, Name, Symbol, Description, DifficultyWeight "
    "FROM dbo.MasterFeatureSymbols WHERE ISNULL(IsActive,1) = 1 "
    "ORDER BY FeatureCategoryID, Id").fetchall()
cn.close()


def cs(value):
    """A C# string literal, or null - with non-ASCII as \\uXXXX escapes.

    The escapes are not decoration: a .cs file carrying raw GD&T glyphs is one
    careless editor save away from mojibake, and this repository has already
    lost characters that way once."""
    if value is None:
        return "null"
    out = []
    for ch in str(value):
        if ch == '"':
            out.append('\\"')
        elif ch == "\\":
            out.append("\\\\")
        elif ord(ch) < 128:
            out.append(ch)
        else:
            out.append(f"\\u{ord(ch):04X}")
    return '"' + "".join(out) + '"'


lines = []
for c in cats:
    lines.append(f'            Cat({c.Id}, {cs(c.Name)}, {cs(c.Description)});')
lines.append("")
for s in syms:
    w = "null" if s.DifficultyWeight is None else f"{s.DifficultyWeight:.2f}m"
    lines.append(
        f'            Sym({s.Id}, {s.FeatureCategoryID}, {cs(s.Name)}, '
        f'{cs(s.Symbol)}, {cs(s.Description)}, {w});')

body = "\n".join(lines)

template = f'''using FluentMigrator;
// WithIdentityInsert lives here, not in the root namespace - it is SQL Server
// specific, because no other provider has the concept.
using FluentMigrator.SqlServer;

namespace DSRFQ.Migrations.DefaultDB;

/// <summary>
/// The GD&amp;T feature vocabulary, copied from DSEFACTORY.
/// </summary>
/// <remarks>
/// A balloon's Symbol column holds whatever recognition read - "\\u2300.380",
/// "\\u23130.005 A B". That is the text, not the CHARACTERISTIC, so nothing
/// could group a drawing's balloons by what is being controlled, price a
/// position tolerance differently from a diameter, or offer an operator a list
/// to correct a misread symbol from.
///
/// These two tables are that vocabulary, and they already exist in DSEFACTORY
/// (MasterFeatureCategories / MasterFeatureSymbols) - so they are copied rather
/// than invented, and the ids are preserved. A balloon in either system then
/// means the same thing by FeatureSymbolId, which matters the moment anything
/// compares the two.
///
/// WithIdentityInsert is deliberate: the ids ARE the shared vocabulary, so the
/// seed writes them explicitly rather than letting SQL Server assign new ones,
/// which would leave two databases whose "14" means different things. The
/// columns are still identities, so a symbol added here later gets an id
/// without any of this. Per row, because SET IDENTITY_INSERT is session state
/// and SQL Server allows it on only one table at a time.
///
/// The symbols are written as \\uXXXX escapes. A .cs file holding raw GD&amp;T
/// glyphs is one careless editor save away from mojibake, and this repository
/// has already lost characters to exactly that.
/// </remarks>
[DefaultDB, MigrationKey(20260901_1500)]
public class DefaultDB_20260901_1500_FeatureSymbols : Migration
{{
    public override void Up()
    {{
        Create.Table("MasterFeatureCategories")
            .WithColumn("Id").AsInt32().Identity().PrimaryKey().NotNullable()
            .WithColumn("Name").AsString(300).Nullable()
            .WithColumn("Description").AsString(1000).Nullable()
            .WithColumn("InsertDate").AsDateTime().Nullable()
            .WithColumn("InsertUserId").AsInt32().Nullable()
            .WithColumn("UpdateDate").AsDateTime().Nullable()
            .WithColumn("UpdateUserId").AsInt32().Nullable()
            .WithColumn("DeleteDate").AsDateTime().Nullable()
            .WithColumn("DeleteUserId").AsInt32().Nullable()
            .WithColumn("IsActive").AsInt32().Nullable().WithDefaultValue(1);

        Create.Table("MasterFeatureSymbols")
            .WithColumn("Id").AsInt32().Identity().PrimaryKey().NotNullable()
            .WithColumn("FeatureCategoryID").AsInt32().Nullable()
                .ForeignKey("FK_MasterFeatureSymbols_Category",
                            "MasterFeatureCategories", "Id")
            .WithColumn("Name").AsString(300).Nullable()
            .WithColumn("Symbol").AsString(300).Nullable()
            .WithColumn("Description").AsString(1000).Nullable()
            // Reserved for pricing: a position tolerance is not the same amount
            // of inspection work as a diameter. Null everywhere today.
            .WithColumn("DifficultyWeight").AsDecimal(18, 2).Nullable()
            .WithColumn("InsertDate").AsDateTime().Nullable()
            .WithColumn("InsertUserId").AsInt32().Nullable()
            .WithColumn("UpdateDate").AsDateTime().Nullable()
            .WithColumn("UpdateUserId").AsInt32().Nullable()
            .WithColumn("DeleteDate").AsDateTime().Nullable()
            .WithColumn("DeleteUserId").AsInt32().Nullable()
            .WithColumn("IsActive").AsInt32().Nullable().WithDefaultValue(1);

        // What recognition matched, on the balloon itself. Nullable: a balloon
        // whose text names no known characteristic - a plain dimension, a note -
        // genuinely has none, and that is different from "not yet classified".
        Alter.Table("CostingPartBalloons")
            .AddColumn("FeatureSymbolID").AsInt32().Nullable()
                .ForeignKey("FK_CostingPartBalloons_FeatureSymbol",
                            "MasterFeatureSymbols", "Id");

{body}
    }}

    private void Cat(int id, string name, string description)
    {{
        Insert.IntoTable("MasterFeatureCategories").WithIdentityInsert().Row(new
        {{
            Id = id,
            Name = name,
            Description = description,
            InsertDate = System.DateTime.UtcNow,
            InsertUserId = 1,
            IsActive = 1
        }});
    }}

    private void Sym(int id, int categoryId, string name, string symbol,
                     string description, decimal? weight)
    {{
        Insert.IntoTable("MasterFeatureSymbols").WithIdentityInsert().Row(new
        {{
            Id = id,
            FeatureCategoryID = categoryId,
            Name = name,
            Symbol = symbol,
            Description = description,
            DifficultyWeight = weight,
            InsertDate = System.DateTime.UtcNow,
            InsertUserId = 1,
            IsActive = 1
        }});
    }}

    public override void Down()
    {{
        Delete.Column("FeatureSymbolID").FromTable("CostingPartBalloons");
        Delete.Table("MasterFeatureSymbols");
        Delete.Table("MasterFeatureCategories");
    }}
}}
'''

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8", newline="\r\n") as fh:
    fh.write(template)

print(f"wrote {OUT}")
print(f"  {len(cats)} categories, {len(syms)} symbols")
for s in syms:
    print(f"    {s.Id:>3}  cat {s.FeatureCategoryID}  {s.Name:<26} "
          f"{s.Symbol!r}  U+{ord(s.Symbol[0]):04X}"
          + (f" +{len(s.Symbol)-1} more" if len(s.Symbol) > 1 else ""))
