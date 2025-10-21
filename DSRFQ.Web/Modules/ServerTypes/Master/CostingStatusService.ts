import { SaveRequest, SaveResponse, ServiceOptions, DeleteRequest, DeleteResponse, RetrieveRequest, RetrieveResponse, ListRequest, ListResponse, serviceRequest } from '@serenity-is/corelib';
import { CostingStatusRow } from './CostingStatusRow';

export namespace CostingStatusService {
    export const baseUrl = 'Master/CostingStatus';

    export declare function Create(request: SaveRequest<CostingStatusRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Update(request: SaveRequest<CostingStatusRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Delete(request: DeleteRequest, onSuccess?: (response: DeleteResponse) => void, opt?: ServiceOptions<any>): PromiseLike<DeleteResponse>;
    export declare function Retrieve(request: RetrieveRequest, onSuccess?: (response: RetrieveResponse<CostingStatusRow>) => void, opt?: ServiceOptions<any>): PromiseLike<RetrieveResponse<CostingStatusRow>>;
    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<CostingStatusRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<CostingStatusRow>>;

    export const Methods = {
        Create: "Master/CostingStatus/Create",
        Update: "Master/CostingStatus/Update",
        Delete: "Master/CostingStatus/Delete",
        Retrieve: "Master/CostingStatus/Retrieve",
        List: "Master/CostingStatus/List"
    } as const;

    [
        'Create', 
        'Update', 
        'Delete', 
        'Retrieve', 
        'List'
    ].forEach(x => {
        (<any>CostingStatusService)[x] = function (r, s, o) { 
            return serviceRequest(baseUrl + '/' + x, r, s, o); 
        };
    });
}