// HAND-WRITTEN STAND-IN for a sergen-generated file.
//
// sergen 8.8.6 targets net8.0 and this machine has only .NET 6 and .NET 10, so
// `dotnet sergen servertypings` cannot run (and crashes under roll-forward).
// Once a .NET 8 runtime is installed, regenerate and this file is overwritten
// with the real output - the shape below deliberately matches it exactly.
import { ServiceOptions, ServiceRequest, ServiceResponse, RetrieveRequest, RetrieveResponse, ListRequest, ListResponse, serviceRequest } from '@serenity-is/corelib';
import { CostingPartQueueRow } from './CostingPartQueueRow';

export interface QueueItemRequest extends ServiceRequest {
    QueueItemId?: number;
}

export interface QueueItemResponse extends ServiceResponse {
    Message?: string;
}

export interface QueueLaneSummary {
    Lane?: string;
    Running?: number;
    Queued?: number;
    Failed?: number;
    OldestWaitSeconds?: number;
    RunningPart?: string;
    RunningSeconds?: number;
}

export interface QueueSummaryResponse extends ServiceResponse {
    Lanes?: QueueLaneSummary[];
    ConsumerLooksDown?: boolean;
}

export namespace CostingPartQueueService {
    export const baseUrl = 'Costing/CostingPartQueue';

    export declare function Retrieve(request: RetrieveRequest, onSuccess?: (response: RetrieveResponse<CostingPartQueueRow>) => void, opt?: ServiceOptions<any>): PromiseLike<RetrieveResponse<CostingPartQueueRow>>;
    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<CostingPartQueueRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<CostingPartQueueRow>>;
    export declare function Cancel(request: QueueItemRequest, onSuccess?: (response: QueueItemResponse) => void, opt?: ServiceOptions<any>): PromiseLike<QueueItemResponse>;
    export declare function Prioritise(request: QueueItemRequest, onSuccess?: (response: QueueItemResponse) => void, opt?: ServiceOptions<any>): PromiseLike<QueueItemResponse>;
    export declare function Requeue(request: QueueItemRequest, onSuccess?: (response: QueueItemResponse) => void, opt?: ServiceOptions<any>): PromiseLike<QueueItemResponse>;
    export declare function Summary(request: ServiceRequest, onSuccess?: (response: QueueSummaryResponse) => void, opt?: ServiceOptions<any>): PromiseLike<QueueSummaryResponse>;

    export const Methods = {
        Retrieve: "Costing/CostingPartQueue/Retrieve",
        List: "Costing/CostingPartQueue/List",
        Cancel: "Costing/CostingPartQueue/Cancel",
        Prioritise: "Costing/CostingPartQueue/Prioritise",
        Requeue: "Costing/CostingPartQueue/Requeue",
        Summary: "Costing/CostingPartQueue/Summary"
    } as const;

    [
        'Retrieve',
        'List',
        'Cancel',
        'Prioritise',
        'Requeue',
        'Summary'
    ].forEach(x => {
        (<any>CostingPartQueueService)[x] = function (r, s, o) {
            return serviceRequest(baseUrl + '/' + x, r, s, o);
        };
    });
}
