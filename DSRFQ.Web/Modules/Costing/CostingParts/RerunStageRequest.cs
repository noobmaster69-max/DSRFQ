using Serenity.Services;

namespace DSRFQ.Costing;

/// <summary>
/// Which part of the pipeline to run again for one costing part.
/// </summary>
/// <remarks>
/// Drawing conversion and OCR are one stage, not two: the consumer's
/// <c>new_costing_part_created</c> handler converts the drawing and writes the
/// recognised fields in a single pass off a single queue message. Offering them
/// as separate buttons would mean two controls doing identical work.
/// </remarks>
public enum RerunStage
{
    /// <summary>Convert the drawing and re-read its title block.</summary>
    Drawing = 1,
    /// <summary>Upload to new_tsh and recalculate the cost.</summary>
    Costing = 2,
    /// <summary>Detect balloons on the converted pages.</summary>
    Ballooning = 3
}

public class RerunStageRequest : ServiceRequest
{
    public int CostingPartId { get; set; }
    public RerunStage Stage { get; set; }
    /// <summary>Queue the work even though the stage is already running.</summary>
    public bool Force { get; set; }

    /// <summary>
    /// Restrict the run to one 1-based page. Null runs the whole document.
    /// </summary>
    /// <remarks>
    /// Ballooning only. A drawing can be five pages and recognition takes
    /// minutes per page, so re-running the sheet you are actually working on
    /// beats re-running all of them - and it leaves the other pages' balloons,
    /// including any hand corrections on them, untouched.
    ///
    /// Ignored by the other stages: drawing conversion and costing both work
    /// on the document as a whole and have no per-page unit of work.
    /// </remarks>
    public int? PageNumber { get; set; }

    /// <summary>
    /// Whole-document ballooning that only visits pages with no balloons yet -
    /// One Supply's "recognise all PDF pages", which skips pages already done.
    /// </summary>
    /// <remarks>
    /// Nothing is cleared up front: the pages it will run have nothing to
    /// clear, and the pages it skips keep everything. The consumer decides
    /// which pages those are when it starts, from the balloons then in the table.
    /// </remarks>
    public bool SkipDonePages { get; set; }
}

public class RerunStageResponse : ServiceResponse
{
    /// <summary>The queue the message was published to, for the log.</summary>
    public string Queue { get; set; }
    /// <summary>Human-readable confirmation to show in a toast.</summary>
    public string Message { get; set; }
}
