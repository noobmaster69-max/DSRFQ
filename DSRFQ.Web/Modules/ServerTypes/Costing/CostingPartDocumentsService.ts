import { SaveRequest, SaveResponse, ServiceOptions, DeleteRequest, DeleteResponse, RetrieveRequest, RetrieveResponse, ListRequest, ListResponse, serviceRequest } from '@serenity-is/corelib';
import { CostingPartDocumentsRow } from './CostingPartDocumentsRow';

export namespace CostingPartDocumentsService {
    export const baseUrl = 'Costing/CostingPartDocuments';

    export declare function Create(request: SaveRequest<CostingPartDocumentsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Update(request: SaveRequest<CostingPartDocumentsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Delete(request: DeleteRequest, onSuccess?: (response: DeleteResponse) => void, opt?: ServiceOptions<any>): PromiseLike<DeleteResponse>;
    export declare function Retrieve(request: RetrieveRequest, onSuccess?: (response: RetrieveResponse<CostingPartDocumentsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<RetrieveResponse<CostingPartDocumentsRow>>;
    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<CostingPartDocumentsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<CostingPartDocumentsRow>>;

    export const Methods = {
        Create: "Costing/CostingPartDocuments/Create",
        Update: "Costing/CostingPartDocuments/Update",
        Delete: "Costing/CostingPartDocuments/Delete",
        Retrieve: "Costing/CostingPartDocuments/Retrieve",
        List: "Costing/CostingPartDocuments/List"
    } as const;

    [
        'Create', 
        'Update', 
        'Delete', 
        'Retrieve', 
        'List'
    ].forEach(x => {
        (<any>CostingPartDocumentsService)[x] = function (r, s, o) { 
            return serviceRequest(baseUrl + '/' + x, r, s, o); 
        };
    });
}