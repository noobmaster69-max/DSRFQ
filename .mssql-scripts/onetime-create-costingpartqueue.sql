-- Purpose: an admission queue for the RFQ pipeline, and the data behind the
-- Processing Queue page.
--
-- Why this exists: every RabbitMQ handler in RFQ/handlers.py spawns a daemon
-- thread and returns, so the consumer acks immediately and takes the next
-- message. Uploading ten drawings therefore started ten conversions at once,
-- each rasterising a whole PDF through the Paddle services on 3500/3600/3501,
-- and the box ran out of memory. RabbitMQ was never the bottleneck -- nothing
-- limited how many parts were in flight.
--
-- One row per admitted job. The consumer's dispatcher only starts a job when
-- its lane has a free slot, so work waits here in 'queued' instead of piling
-- into the services. The same rows are what the UI shows, so "what is running
-- and what is behind it" is a query rather than a guess.
--
-- Lanes are independent because the work is: drawing conversion hammers the
-- OCR services, costing talks to tsh_new on 8888, ballooning to the Bubble
-- engine on 5998. Serialising all three against each other would idle two
-- machines to protect one.
--
-- Idempotent: safe to re-run.

USE RFQ;
GO

SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.CostingPartQueue') IS NULL
BEGIN
    CREATE TABLE dbo.CostingPartQueue (
        ID              INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_CostingPartQueue PRIMARY KEY,
        CostingPartID   INT           NOT NULL
            CONSTRAINT FK_CostingPartQueue_CostingParts
                FOREIGN KEY REFERENCES dbo.CostingParts(ID),

        -- Which pool of work this competes for: drawing | costing | ballooning.
        -- Each lane has its own concurrency limit in the consumer's config.
        Lane            NVARCHAR(20)  NOT NULL,
        -- The RabbitMQ queue the job is dispatched to when admitted, e.g.
        -- 'NewCostingParts'. Kept separate from Lane because RetryOcr and
        -- NewCostingParts share the drawing lane but are different handlers.
        QueueName       NVARCHAR(64)  NOT NULL,
        -- The original message body, when it was not just a bare part id.
        Payload         NVARCHAR(MAX) NULL,

        -- queued | running | completed | failed | cancelled
        Status          NVARCHAR(20)  NOT NULL
            CONSTRAINT DF_CPQ_Status DEFAULT ('queued'),
        -- Lower runs first, then QueuedAt. A re-run of a part someone is
        -- waiting on can be pushed ahead of a bulk upload without cancelling it.
        Priority        INT           NOT NULL CONSTRAINT DF_CPQ_Priority DEFAULT (100),

        QueuedAt        DATETIME      NOT NULL CONSTRAINT DF_CPQ_QueuedAt DEFAULT (GETDATE()),
        StartedAt       DATETIME      NULL,
        FinishedAt      DATETIME      NULL,

        -- How many times this job has been admitted. A job that fails and is
        -- requeued keeps its row, so its history stays in one place.
        Attempt         INT           NOT NULL CONSTRAINT DF_CPQ_Attempt DEFAULT (0),
        LastError       NVARCHAR(1000) NULL,
        -- Which consumer process admitted it, so two consumers against one
        -- database can be told apart.
        WorkerId        NVARCHAR(64)  NULL,
        -- Links to CostingPartStageTimings, so the queue row and the per-step
        -- breakdown of the run it started can be joined.
        RunId           NVARCHAR(40)  NULL,

        InsertDate      DATETIME NOT NULL CONSTRAINT DF_CPQ_InsertDate   DEFAULT (GETDATE()),
        InsertUserId    INT      NOT NULL CONSTRAINT DF_CPQ_InsertUserId DEFAULT (1),
        UpdateDate      DATETIME NULL,
        UpdateUserId    INT      NULL,
        DeleteDate      DATETIME NULL,
        DeleteUserId    INT      NULL,
        IsActive        SMALLINT NOT NULL CONSTRAINT DF_CPQ_IsActive DEFAULT (1)
    );

    -- The dispatcher's hot path: "next queued job in this lane" and "how many
    -- are running in this lane".
    CREATE INDEX IX_CostingPartQueue_Lane_Status
        ON dbo.CostingPartQueue (Lane, Status, Priority, QueuedAt)
        INCLUDE (CostingPartID, QueueName, StartedAt);

    -- A part is enqueued at most once per lane while it is still pending or
    -- running. Without this, double-clicking Re-run or an upload racing the
    -- consumer's own enqueue would put the same part in the lane twice and the
    -- second admission would duplicate everything the first one wrote.
    --
    -- Filtered rather than a plain unique index: completed and failed rows are
    -- history and a part is expected to accumulate many of them.
    CREATE UNIQUE INDEX UX_CostingPartQueue_Active
        ON dbo.CostingPartQueue (CostingPartID, Lane)
        WHERE Status IN ('queued', 'running') AND IsActive = 1;

    -- The page's default view is "everything, newest first".
    CREATE INDEX IX_CostingPartQueue_Recent
        ON dbo.CostingPartQueue (QueuedAt DESC)
        INCLUDE (CostingPartID, Lane, Status);
END
GO

SELECT COUNT(*) AS ColumnCount FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'CostingPartQueue';
GO
