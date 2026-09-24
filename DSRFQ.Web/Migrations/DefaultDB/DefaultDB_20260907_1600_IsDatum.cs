using FluentMigrator;

namespace DSRFQ.Migrations.DefaultDB;

/// <summary>
/// Marks a balloon as a datum FEATURE - the surface everything else is
/// measured from, rather than something measured.
/// </summary>
/// <remarks>
/// A boolean beside IsNote rather than a row in MasterFeatureSymbols, for two
/// reasons. It is the same kind of fact as IsNote - "this balloon is not an
/// ordinary dimension" - and it keeps the shared catalogue shared: those ids
/// are matched against DSEFACTORY's, and inventing a sixteenth here would make
/// the two disagree the moment DSEFACTORY adds its own.
///
/// Not to be confused with a datum REFERENCE. "⌖ ⌀.005 A B C" cites datums A,
/// B and C; that is already parsed out of the frame text into the annotation's
/// analyser. This column is for the standalone ▲ marker that declares a
/// surface to BE datum A.
///
/// Written by the RFQ consumer at insert time (feature_symbols.is_datum_symbol)
/// and editable afterwards, since recognition reads a hollow triangle off a
/// poor scan often enough to be worth correcting by hand.
/// </remarks>
[DefaultDB, MigrationKey(20260907_1600)]
public class DefaultDB_20260907_1600_IsDatum : Migration
{
    public override void Up()
    {
        // Nullable with no default, matching IsNote: an existing row was never
        // classified either way, and defaulting it to 0 would assert something
        // recognition never decided.
        Alter.Table("CostingPartBalloons")
            .AddColumn("IsDatum").AsBoolean().Nullable();
    }

    public override void Down()
    {
        Delete.Column("IsDatum").FromTable("CostingPartBalloons");
    }
}
