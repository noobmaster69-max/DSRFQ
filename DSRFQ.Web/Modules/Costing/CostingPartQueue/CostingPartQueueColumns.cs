using Serenity.ComponentModel;
using System;
using System.ComponentModel;

namespace DSRFQ.Costing.Columns;

/// <summary>
/// The queue as an operator reads it: where a job is in line, how long it has
/// been there, and why it stopped if it did.
/// </summary>
[ColumnsScript("Costing.CostingPartQueue")]
[BasedOnRow(typeof(CostingPartQueueRow), CheckNames = true)]
public class CostingPartQueueColumns
{
    [DisplayName("Db.Shared.RecordId"), AlignRight, Width(70)]
    public int Id { get; set; }

    /// <summary>Rendered as a coloured pill by the grid.</summary>
    [Width(110)]
    public string Status { get; set; }

    /// <summary>1 = next to start. Blank once the job is no longer waiting.</summary>
    [DisplayName("#"), AlignRight, Width(50)]
    public int Position { get; set; }

    [Width(110)]
    public string Lane { get; set; }

    [DisplayName("Part"), AlignRight, Width(70)]
    public int CostingPartId { get; set; }

    [DisplayName("Part Number"), Width(160)]
    public string PartNumber { get; set; }

    [Width(80)]
    public string Revision { get; set; }

    [DisplayName("Description"), Width(220)]
    public string PartDescription { get; set; }

    /// <summary>Formatted as a duration by the grid; the raw value is seconds.</summary>
    [DisplayName("Elapsed"), AlignRight, Width(90)]
    public int ElapsedSeconds { get; set; }

    [DateTimeFormatter(DisplayFormat = "yyyy-MM-dd HH:mm:ss"), Width(140)]
    public DateTime QueuedAt { get; set; }

    [DateTimeFormatter(DisplayFormat = "yyyy-MM-dd HH:mm:ss"), Width(140)]
    public DateTime StartedAt { get; set; }

    [DateTimeFormatter(DisplayFormat = "yyyy-MM-dd HH:mm:ss"), Width(140)]
    public DateTime FinishedAt { get; set; }

    [AlignRight, Width(70)]
    public int Attempt { get; set; }

    [AlignRight, Width(70)]
    public int Priority { get; set; }

    [DisplayName("Last Error"), Width(260)]
    public string LastError { get; set; }

    [DisplayName("Source Queue"), Width(150)]
    public string QueueName { get; set; }

    [DisplayName("Worker"), Width(140)]
    public string WorkerId { get; set; }
}
