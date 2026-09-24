import { ServiceOptions, RetrieveRequest, RetrieveResponse, ListRequest, ListResponse, serviceRequest } from '@serenity-is/corelib';
import { CostingPartStageTimingsRow } from './CostingPartStageTimingsRow';

export namespace CostingPartStageTimingsService {
    export const baseUrl = 'Costing/CostingPartStageTimings';

    export declare function Retrieve(request: RetrieveRequest, onSuccess?: (response: RetrieveResponse<CostingPartStageTimingsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<RetrieveResponse<CostingPartStageTimingsRow>>;
    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<CostingPartStageTimingsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<CostingPartStageTimingsRow>>;

    export const Methods = {
        Retrieve: "Costing/CostingPartStageTimings/Retrieve",
        List: "Costing/CostingPartStageTimings/List"
    } as const;

    [
        'Retrieve',
        'List'
    ].forEach(x => {
        (<any>CostingPartStageTimingsService)[x] = function (r, s, o) {
            return serviceRequest(baseUrl + '/' + x, r, s, o);
        };
    });
}
