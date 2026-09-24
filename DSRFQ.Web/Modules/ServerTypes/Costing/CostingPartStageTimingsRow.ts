import { fieldsProxy } from '@serenity-is/corelib';

export interface CostingPartStageTimingsRow {
    Id?: number;
    CostingPartID?: number;
    RunId?: string;
    Sequence?: number;
    Stage?: string;
    Label?: string;
    StartTime?: string;
    EndTime?: string;
    DurationMs?: number;
    Status?: string;
    Detail?: string;
    InsertDate?: string;
    InsertUserId?: number;
    UpdateDate?: string;
    UpdateUserId?: number;
    DeleteDate?: string;
    DeleteUserId?: number;
    IsActive?: number;
}

export abstract class CostingPartStageTimingsRow {
    static readonly idProperty = 'Id';
    static readonly nameProperty = 'Stage';
    static readonly localTextPrefix = 'Costing.CostingPartStageTimings';

    static readonly readPermission = '?';

    static readonly Fields = fieldsProxy<CostingPartStageTimingsRow>();
}
