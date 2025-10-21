import { SaveRequest, SaveResponse, ServiceOptions, DeleteRequest, DeleteResponse, RetrieveRequest, RetrieveResponse, ListRequest, ListResponse, serviceRequest } from '@serenity-is/corelib';
import { CostingPartSpecialProcessResultsRow } from './CostingPartSpecialProcessResultsRow';

export namespace CostingPartSpecialProcessResultsService {
    export const baseUrl = 'Costing/CostingPartSpecialProcessResults';

    export declare function Create(request: SaveRequest<CostingPartSpecialProcessResultsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Update(request: SaveRequest<CostingPartSpecialProcessResultsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Delete(request: DeleteRequest, onSuccess?: (response: DeleteResponse) => void, opt?: ServiceOptions<any>): PromiseLike<DeleteResponse>;
    export declare function Retrieve(request: RetrieveRequest, onSuccess?: (response: RetrieveResponse<CostingPartSpecialProcessResultsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<RetrieveResponse<CostingPartSpecialProcessResultsRow>>;
    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<CostingPartSpecialProcessResultsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<CostingPartSpecialProcessResultsRow>>;

    export const Methods = {
        Create: "Costing/CostingPartSpecialProcessResults/Create",
        Update: "Costing/CostingPartSpecialProcessResults/Update",
        Delete: "Costing/CostingPartSpecialProcessResults/Delete",
        Retrieve: "Costing/CostingPartSpecialProcessResults/Retrieve",
        List: "Costing/CostingPartSpecialProcessResults/List"
    } as const;

    [
        'Create', 
        'Update', 
        'Delete', 
        'Retrieve', 
        'List'
    ].forEach(x => {
        (<any>CostingPartSpecialProcessResultsService)[x] = function (r, s, o) { 
            return serviceRequest(baseUrl + '/' + x, r, s, o); 
        };
    });
}