using FluentMigrator;

namespace DSRFQ.Migrations.DefaultDB;

/// <summary>
/// Drop DatumDetectionEnabled. It was a switch that could only make things worse.
/// </summary>
/// <remarks>
/// It was added as "find datum features by geometry", with the off position
/// falling back to looking for a ▲ in the recognised text. That framing was
/// wrong in two ways.
///
/// It saved nothing. The geometric pass runs in the middleware - Balloon.py
/// calls detect_datum_records on every ballooning upload, unconditionally, and
/// returns the result in the response. This column only decided whether the
/// consumer then threw that result away. The OpenCV work happened either way,
/// so the "off" position cost exactly as much and returned less.
///
/// And nothing wanted the off position. The text rule cannot tell a datum's
/// boxed capital from a feature control frame's - that ambiguity is the whole
/// reason the geometric detector exists - and it misses any datum whose
/// triangle recognition dropped. It is still there as an automatic fallback for
/// balloons no datum was matched to, which is the only role it is fit for.
///
/// What remains is DatumAddMissing, which is a real editorial decision - whether
/// new balloons appear in the inspection report - and the confidence floor that
/// guards it.
/// </remarks>
[DefaultDB, MigrationKey(20260908_1000)]
public class DefaultDB_20260908_1000_DropDatumDetectionEnabled : Migration
{
    public override void Up()
    {
        Delete.Column("DatumDetectionEnabled").FromTable("MasterSettings");
    }

    public override void Down()
    {
        Alter.Table("MasterSettings")
            .AddColumn("DatumDetectionEnabled").AsBoolean().NotNullable()
                .WithDefaultValue(true);
    }
}
