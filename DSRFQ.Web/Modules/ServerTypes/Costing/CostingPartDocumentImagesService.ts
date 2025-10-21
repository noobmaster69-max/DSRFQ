import { SaveRequest, SaveResponse, ServiceOptions, DeleteRequest, DeleteResponse, RetrieveRequest, RetrieveResponse, ListRequest, ListResponse, serviceRequest } from '@serenity-is/corelib';
import { CostingPartDocumentImagesRow } from './CostingPartDocumentImagesRow';

export namespace CostingPartDocumentImagesService {
    export const baseUrl = 'Costing/CostingPartDocumentImages';

    export declare function Create(request: SaveRequest<CostingPartDocumentImagesRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Update(request: SaveRequest<CostingPartDocumentImagesRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Delete(request: DeleteRequest, onSuccess?: (response: DeleteResponse) => void, opt?: ServiceOptions<any>): PromiseLike<DeleteResponse>;
    export declare function Retrieve(request: RetrieveRequest, onSuccess?: (response: RetrieveResponse<CostingPartDocumentImagesRow>) => void, opt?: ServiceOptions<any>): PromiseLike<RetrieveResponse<CostingPartDocumentImagesRow>>;
    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<CostingPartDocumentImagesRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<CostingPartDocumentImagesRow>>;

    export const Methods = {
        Create: "Costing/CostingPartDocumentImages/Create",
        Update: "Costing/CostingPartDocumentImages/Update",
        Delete: "Costing/CostingPartDocumentImages/Delete",
        Retrieve: "Costing/CostingPartDocumentImages/Retrieve",
        List: "Costing/CostingPartDocumentImages/List"
    } as const;

    [
        'Create', 
        'Update', 
        'Delete', 
        'Retrieve', 
        'List'
    ].forEach(x => {
        (<any>CostingPartDocumentImagesService)[x] = function (r, s, o) { 
            return serviceRequest(baseUrl + '/' + x, r, s, o); 
        };
    });
}