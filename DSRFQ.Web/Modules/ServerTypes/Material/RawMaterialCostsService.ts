import { SaveRequest, SaveResponse, ServiceOptions, DeleteRequest, DeleteResponse, RetrieveRequest, RetrieveResponse, ListRequest, ListResponse, serviceRequest } from '@serenity-is/corelib';
import { RawMaterialCostsRow } from './RawMaterialCostsRow';

export namespace RawMaterialCostsService {
    export const baseUrl = 'Material/RawMaterialCosts';

    export declare function Create(request: SaveRequest<RawMaterialCostsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Update(request: SaveRequest<RawMaterialCostsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Delete(request: DeleteRequest, onSuccess?: (response: DeleteResponse) => void, opt?: ServiceOptions<any>): PromiseLike<DeleteResponse>;
    export declare function Retrieve(request: RetrieveRequest, onSuccess?: (response: RetrieveResponse<RawMaterialCostsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<RetrieveResponse<RawMaterialCostsRow>>;
    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<RawMaterialCostsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<RawMaterialCostsRow>>;

    export const Methods = {
        Create: "Material/RawMaterialCosts/Create",
        Update: "Material/RawMaterialCosts/Update",
        Delete: "Material/RawMaterialCosts/Delete",
        Retrieve: "Material/RawMaterialCosts/Retrieve",
        List: "Material/RawMaterialCosts/List"
    } as const;

    [
        'Create', 
        'Update', 
        'Delete', 
        'Retrieve', 
        'List'
    ].forEach(x => {
        (<any>RawMaterialCostsService)[x] = function (r, s, o) { 
            return serviceRequest(baseUrl + '/' + x, r, s, o); 
        };
    });
}