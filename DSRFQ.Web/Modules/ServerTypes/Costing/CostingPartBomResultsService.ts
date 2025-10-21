import { SaveRequest, SaveResponse, ServiceOptions, DeleteRequest, DeleteResponse, RetrieveRequest, RetrieveResponse, ListRequest, ListResponse, serviceRequest } from '@serenity-is/corelib';
import { CostingPartBomResultsRow } from './CostingPartBomResultsRow';

export namespace CostingPartBomResultsService {
    export const baseUrl = 'Costing/CostingPartBomResults';

    export declare function Create(request: SaveRequest<CostingPartBomResultsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Update(request: SaveRequest<CostingPartBomResultsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Delete(request: DeleteRequest, onSuccess?: (response: DeleteResponse) => void, opt?: ServiceOptions<any>): PromiseLike<DeleteResponse>;
    export declare function Retrieve(request: RetrieveRequest, onSuccess?: (response: RetrieveResponse<CostingPartBomResultsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<RetrieveResponse<CostingPartBomResultsRow>>;
    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<CostingPartBomResultsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<CostingPartBomResultsRow>>;

    export const Methods = {
        Create: "Costing/CostingPartBomResults/Create",
        Update: "Costing/CostingPartBomResults/Update",
        Delete: "Costing/CostingPartBomResults/Delete",
        Retrieve: "Costing/CostingPartBomResults/Retrieve",
        List: "Costing/CostingPartBomResults/List"
    } as const;

    [
        'Create', 
        'Update', 
        'Delete', 
        'Retrieve', 
        'List'
    ].forEach(x => {
        (<any>CostingPartBomResultsService)[x] = function (r, s, o) { 
            return serviceRequest(baseUrl + '/' + x, r, s, o); 
        };
    });
}