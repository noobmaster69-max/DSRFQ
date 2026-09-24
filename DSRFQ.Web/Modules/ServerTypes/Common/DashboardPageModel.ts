import { CostCategory } from "./CostCategory";
import { LaneOutcome } from "./LaneOutcome";
import { PipelineFailure } from "./PipelineFailure";
import { PipelineStepStatus } from "./PipelineStepStatus";
import { StageDuration } from "./StageDuration";

export interface DashboardPageModel {
    PartCount?: number;
    StageRuns?: number;
    StageSuccessRate?: number;
    MedianTurnaroundSeconds?: number;
    QuotedValue?: number;
    OpenJobs?: number;
    FailedJobs?: number;
    StageDurations?: StageDuration[];
    PipelineSteps?: PipelineStepStatus[];
    LaneOutcomes?: LaneOutcome[];
    CostBreakdown?: CostCategory[];
    RecentFailures?: PipelineFailure[];
}
