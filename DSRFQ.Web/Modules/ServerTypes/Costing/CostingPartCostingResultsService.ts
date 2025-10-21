import { SaveRequest, SaveResponse, ServiceOptions, DeleteRequest, DeleteResponse, RetrieveRequest, RetrieveResponse, ListRequest, ListResponse, serviceRequest } from '@serenity-is/corelib';
import { CostingPartCostingResultsRow } from './CostingPartCostingResultsRow';

export namespace CostingPartCostingResultsService {
    export const baseUrl = 'Costing/CostingPartCostingResults';

    export declare function Create(request: SaveRequest<CostingPartCostingResultsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Update(request: SaveRequest<CostingPartCostingResultsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Delete(request: DeleteRequest, onSuccess?: (response: DeleteResponse) => void, opt?: ServiceOptions<any>): PromiseLike<DeleteResponse>;
    export declare function Retrieve(request: RetrieveRequest, onSuccess?: (response: RetrieveResponse<CostingPartCostingResultsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<RetrieveResponse<CostingPartCostingResultsRow>>;
    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<CostingPartCostingResultsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<CostingPartCostingResultsRow>>;

    export const Methods = {
        Create: "Costing/CostingPartCostingResults/Create",
        Update: "Costing/CostingPartCostingResults/Update",
        Delete: "Costing/CostingPartCostingResults/Delete",
        Retrieve: "Costing/CostingPartCostingResults/Retrieve",
        List: "Costing/CostingPartCostingResults/List"
    } as const;

    [
        'Create', 
        'Update', 
        'Delete', 
        'Retrieve', 
        'List'
    ].forEach(x => {
        (<any>CostingPartCostingResultsService)[x] = function (r, s, o) { 
            return serviceRequest(baseUrl + '/' + x, r, s, o); 
        };
    });
}