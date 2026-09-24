using FluentMigrator;
// WithIdentityInsert lives here, not in the root namespace - it is SQL Server
// specific, because no other provider has the concept.
using FluentMigrator.SqlServer;

namespace DSRFQ.Migrations.DefaultDB;

/// <summary>
/// The GD&amp;T feature vocabulary, copied from DSEFACTORY.
/// </summary>
/// <remarks>
/// A balloon's Symbol column holds whatever recognition read - "\u2300.380",
/// "\u23130.005 A B". That is the text, not the CHARACTERISTIC, so nothing
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
/// The symbols are written as \uXXXX escapes. A .cs file holding raw GD&amp;T
/// glyphs is one careless editor save away from mojibake, and this repository
/// has already lost characters to exactly that.
/// </remarks>
[DefaultDB, MigrationKey(20260901_1500)]
public class DefaultDB_20260901_1500_FeatureSymbols : Migration
{
    public override void Up()
    {
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

            Cat(1, "GD&T - Form", null);
            Cat(2, "GD&T - Profile", null);
            Cat(3, "GD&T - Orientation", null);
            Cat(4, "GD&T - Location", null);
            Cat(5, "GD&T - Runout", null);
            Cat(6, "Dimensioning", null);
            Cat(7, "Modifiers", null);
            Cat(8, "Surface", null);

            Sym(1, 1, "Flatness", "\u25B1", null, null);
            Sym(2, 1, "Circularity (Roundness)", "\u25CB", null, null);
            Sym(3, 1, "Cylindricity", "\u232D", null, null);
            Sym(7, 1, "Straightness", "\u23E4", null, null);
            Sym(8, 2, "Profile of a Line", "\u2312", null, null);
            Sym(9, 2, "Profile of a Surface", "\u2313", null, null);
            Sym(10, 3, "Perpendicularity", "\u27C2", null, null);
            Sym(11, 3, "Parallelism", "\u2225", null, null);
            Sym(14, 4, "Position", "\u2316", null, null);
            Sym(15, 4, "Concentricity", "\u25CE", null, null);
            Sym(12, 5, "Circular Runout", "\u2197", null, null);
            Sym(13, 5, "Total Runout", "\u2330", null, null);
            Sym(4, 6, "Diameter", "\u00D8", null, null);
            Sym(5, 6, "Spherical Diameter", "S\u00D8", null, null);
            Sym(6, 7, "Free State", "\u24BB", null, null);
    }

    private void Cat(int id, string name, string description)
    {
        Insert.IntoTable("MasterFeatureCategories").WithIdentityInsert().Row(new
        {
            Id = id,
            Name = name,
            Description = description,
            InsertDate = System.DateTime.UtcNow,
            InsertUserId = 1,
            IsActive = 1
        });
    }

    private void Sym(int id, int categoryId, string name, string symbol,
                     string description, decimal? weight)
    {
        Insert.IntoTable("MasterFeatureSymbols").WithIdentityInsert().Row(new
        {
            Id = id,
            FeatureCategoryID = categoryId,
            Name = name,
            Symbol = symbol,
            Description = description,
            DifficultyWeight = weight,
            InsertDate = System.DateTime.UtcNow,
            InsertUserId = 1,
            IsActive = 1
        });
    }

    public override void Down()
    {
        Delete.Column("FeatureSymbolID").FromTable("CostingPartBalloons");
        Delete.Table("MasterFeatureSymbols");
        Delete.Table("MasterFeatureCategories");
    }
}
