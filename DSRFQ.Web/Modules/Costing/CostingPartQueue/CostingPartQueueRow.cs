using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;

namespace DSRFQ.Costing;

/// <summary>
/// One admitted-or-waiting job in the RFQ pipeline.
///
/// Written by DSRFQ when a part is uploaded or re-run, and by the RFQ
/// consumer's queue_store when a message arrives; the consumer's dispatcher
/// starts a job only when its lane has a free slot. Before this existed nothing
/// throttled the pipeline -- every handler spawned a thread and returned, so ten
/// drawings uploaded together started ten conversions at once and exhausted the
/// box's memory.
///
/// Read-only from the grid's point of view. Rows are not edited by hand; the
/// endpoint exposes Cancel, Requeue and Prioritise instead, because each of
/// those has to touch CostingParts as well to keep the two in step.
/// </summary>
[ConnectionKey("Default"), Module("Costing"), TableName("CostingPartQueue")]
[DisplayName("Processing Queue"), InstanceName("Queued Job")]
[ReadPermission("?")]
[ModifyPermission("?")]
public sealed class CostingPartQueueRow : LoggingRow<CostingPartQueueRow.RowFields>,
    IIdRow, INameRow
{
    const string jPart = nameof(jPart);

    [DisplayName("Id"), Column("ID"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Part"), Column("CostingPartID"), NotNull]
    [ForeignKey(typeof(CostingPartsRow)), LeftJoin(jPart)]
    public int? CostingPartId { get => fields.CostingPartId[this]; set => fields.CostingPartId[this] = value; }

    /// <summary>drawing | costing | ballooning -- which pool of work this competes for.</summary>
    [DisplayName("Lane"), Size(20), NotNull, QuickSearch]
    public string Lane { get => fields.Lane[this]; set => fields.Lane[this] = value; }

    /// <summary>The RabbitMQ queue the job is dispatched to once admitted.</summary>
    [DisplayName("Source Queue"), Size(64), NotNull]
    public string QueueName { get => fields.QueueName[this]; set => fields.QueueName[this] = value; }

    /// <summary>
    /// The original queue message, when it was not just a bare part id. NVARCHAR(MAX),
    /// so deliberately no Size: the column is not length-checked on the way in.
    /// </summary>
    [DisplayName("Payload")]
    public string Payload { get => fields.Payload[this]; set => fields.Payload[this] = value; }

    /// <summary>queued | running | completed | failed | cancelled</summary>
    [DisplayName("Status"), Size(20), NotNull]
    public string Status { get => fields.Status[this]; set => fields.Status[this] = value; }

    /// <summary>Lower runs first, then QueuedAt. 100 is the default.</summary>
    [DisplayName("Priority"), NotNull]
    public int? Priority { get => fields.Priority[this]; set => fields.Priority[this] = value; }

    [DisplayName("Queued At"), NotNull]
    public DateTime? QueuedAt { get => fields.QueuedAt[this]; set => fields.QueuedAt[this] = value; }

    [DisplayName("Started At")]
    public DateTime? StartedAt { get => fields.StartedAt[this]; set => fields.StartedAt[this] = value; }

    [DisplayName("Finished At")]
    public DateTime? FinishedAt { get => fields.FinishedAt[this]; set => fields.FinishedAt[this] = value; }

    [DisplayName("Attempt"), NotNull]
    public int? Attempt { get => fields.Attempt[this]; set => fields.Attempt[this] = value; }

    [DisplayName("Last Error"), Size(1000)]
    public string LastError { get => fields.LastError[this]; set => fields.LastError[this] = value; }

    /// <summary>host:pid of the consumer that admitted the job.</summary>
    [DisplayName("Worker"), Size(64)]
    public string WorkerId { get => fields.WorkerId[this]; set => fields.WorkerId[this] = value; }

    /// <summary>Joins to CostingPartStageTimings for the per-step breakdown.</summary>
    [DisplayName("Run"), Size(40)]
    public string RunId { get => fields.RunId[this]; set => fields.RunId[this] = value; }

    // ── From the part, so the grid does not need a second round trip ────────

    [DisplayName("Part Number"), Origin(jPart, nameof(CostingPartsRow.PartNumber))]
    [QuickSearch, NameProperty]
    public string PartNumber { get => fields.PartNumber[this]; set => fields.PartNumber[this] = value; }

    [DisplayName("Revision"), Origin(jPart, nameof(CostingPartsRow.Revision))]
    public string Revision { get => fields.Revision[this]; set => fields.Revision[this] = value; }

    [DisplayName("Description"), Origin(jPart, nameof(CostingPartsRow.Description))]
    public string PartDescription { get => fields.PartDescription[this]; set => fields.PartDescription[this] = value; }

    /// <summary>
    /// How long the job has been waiting or running, in seconds.
    /// </summary>
    /// <remarks>
    /// Computed here rather than in the browser because the two clocks are not
    /// the same one: the grid would otherwise show a job queued "in 3 seconds"
    /// on any machine whose clock is behind the server's.
    ///
    /// For a finished job this is how long it took; for a live one, how long it
    /// has been going so far.
    /// </remarks>
    [DisplayName("Elapsed (s)"), Expression(
        "DATEDIFF(second, " +
        "  CASE WHEN T0.[Status] = 'queued' THEN T0.[QueuedAt] ELSE T0.[StartedAt] END, " +
        "  COALESCE(T0.[FinishedAt], GETDATE()))")]
    public int? ElapsedSeconds { get => fields.ElapsedSeconds[this]; set => fields.ElapsedSeconds[this] = value; }

    /// <summary>
    /// 1 for the job that will start next in its lane, 2 for the one behind it,
    /// and so on. Null once the job is no longer waiting.
    /// </summary>
    /// <remarks>
    /// A correlated count rather than ROW_NUMBER: Serenity builds the SELECT
    /// list from field expressions, so a window function would need an OVER
    /// clause it has nowhere to put. The queue is short enough that counting
    /// the rows ahead of each one is not worth optimising.
    /// </remarks>
    [DisplayName("Position"), Expression(
        "CASE WHEN T0.[Status] = 'queued' THEN (" +
        "  SELECT COUNT(*) FROM dbo.CostingPartQueue q2 " +
        "  WHERE q2.Lane = T0.[Lane] AND q2.Status = 'queued' AND q2.IsActive = 1 " +
        "    AND (q2.Priority < T0.[Priority] " +
        "      OR (q2.Priority = T0.[Priority] AND q2.QueuedAt < T0.[QueuedAt]) " +
        "      OR (q2.Priority = T0.[Priority] AND q2.QueuedAt = T0.[QueuedAt] AND q2.ID <= T0.[ID]))" +
        ") END")]
    public int? Position { get => fields.Position[this]; set => fields.Position[this] = value; }

    public class RowFields : LoggingRowFields
    {
        public Int32Field Id;
        public Int32Field CostingPartId;
        public StringField Lane;
        public StringField QueueName;
        public StringField Payload;
        public StringField Status;
        public Int32Field Priority;
        public DateTimeField QueuedAt;
        public DateTimeField StartedAt;
        public DateTimeField FinishedAt;
        public Int32Field Attempt;
        public StringField LastError;
        public StringField WorkerId;
        public StringField RunId;

        public StringField PartNumber;
        public StringField Revision;
        public StringField PartDescription;

        public Int32Field ElapsedSeconds;
        public Int32Field Position;
    }
}
