using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;

namespace DSRFQ.Costing;

/// <summary>
/// One step of one processing run for a costing part.
///
/// Written by the RFQ consumer (handlers.StageTimer), read by the costing
/// workspace so a slow part can be explained without correlating consumer logs
/// against service output folders by hand.
///
/// Read-only from the application's point of view: the pipeline owns these
/// rows, so no insert/update/delete permission is granted.
/// </summary>
[ConnectionKey("Default"), Module("Costing"), TableName("CostingPartStageTimings")]
[DisplayName("Processing Steps"), InstanceName("Processing Step")]
[ReadPermission("?")]
public sealed class CostingPartStageTimingsRow : LoggingRow<CostingPartStageTimingsRow.RowFields>,
    IIdRow, INameRow
{
    [DisplayName("Id"), Column("ID"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Costing Part"), NotNull, ForeignKey("CostingParts", "ID"), LeftJoin("part")]
    public int? CostingPartID { get => fields.CostingPartID[this]; set => fields.CostingPartID[this] = value; }

    /// <summary>Groups the steps of a single pass, so re-runs stay separable.</summary>
    [DisplayName("Run"), Size(40), NotNull]
    public string RunId { get => fields.RunId[this]; set => fields.RunId[this] = value; }

    [DisplayName("Sequence"), NotNull]
    public int? Sequence { get => fields.Sequence[this]; set => fields.Sequence[this] = value; }

    [DisplayName("Stage"), Size(64), NotNull, QuickSearch, NameProperty]
    public string Stage { get => fields.Stage[this]; set => fields.Stage[this] = value; }

    [DisplayName("Label"), Size(128)]
    public string Label { get => fields.Label[this]; set => fields.Label[this] = value; }

    [DisplayName("Start Time"), NotNull]
    public DateTime? StartTime { get => fields.StartTime[this]; set => fields.StartTime[this] = value; }

    [DisplayName("End Time")]
    public DateTime? EndTime { get => fields.EndTime[this]; set => fields.EndTime[this] = value; }

    [DisplayName("Duration (ms)")]
    public int? DurationMs { get => fields.DurationMs[this]; set => fields.DurationMs[this] = value; }

    /// <summary>running | completed | failed | skipped</summary>
    [DisplayName("Status"), Size(20), NotNull]
    public string Status { get => fields.Status[this]; set => fields.Status[this] = value; }

    [DisplayName("Detail"), Size(400)]
    public string Detail { get => fields.Detail[this]; set => fields.Detail[this] = value; }

    public class RowFields : LoggingRowFields
    {
        public Int32Field Id;
        public Int32Field CostingPartID;
        public StringField RunId;
        public Int32Field Sequence;
        public StringField Stage;
        public StringField Label;
        public DateTimeField StartTime;
        public DateTimeField EndTime;
        public Int32Field DurationMs;
        public StringField Status;
        public StringField Detail;
    }
}
