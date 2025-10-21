import { SaveRequest, SaveResponse, ServiceOptions, DeleteRequest, DeleteResponse, RetrieveRequest, RetrieveResponse, ListRequest, ListResponse, serviceRequest } from '@serenity-is/corelib';
import { CostingPartsRow } from './CostingPartsRow';

export namespace CostingPartsService {
    export const baseUrl = 'Costing/CostingParts';

    export declare function Create(request: SaveRequest<CostingPartsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Update(request: SaveRequest<CostingPartsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Delete(request: DeleteRequest, onSuccess?: (response: DeleteResponse) => void, opt?: ServiceOptions<any>): PromiseLike<DeleteResponse>;
    export declare function Retrieve(request: RetrieveRequest, onSuccess?: (response: RetrieveResponse<CostingPartsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<RetrieveResponse<CostingPartsRow>>;
    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<CostingPartsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<CostingPartsRow>>;

    export const Methods = {
        Create: "Costing/CostingParts/Create",
        Update: "Costing/CostingParts/Update",
        Delete: "Costing/CostingParts/Delete",
        Retrieve: "Costing/CostingParts/Retrieve",
        List: "Costing/CostingParts/List"
    } as const;

    [
        'Create', 
        'Update', 
        'Delete', 
        'Retrieve', 
        'List'
    ].forEach(x => {
        (<any>CostingPartsService)[x] = function (r, s, o) { 
            return serviceRequest(baseUrl + '/' + x, r, s, o); 
        };
    });
}