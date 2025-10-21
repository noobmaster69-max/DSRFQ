import { SaveRequest, SaveResponse, ServiceOptions, DeleteRequest, DeleteResponse, RetrieveRequest, RetrieveResponse, ListRequest, ListResponse, serviceRequest } from '@serenity-is/corelib';
import { MaterialsRow } from './MaterialsRow';

export namespace MaterialsService {
    export const baseUrl = 'Material/Materials';

    export declare function Create(request: SaveRequest<MaterialsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Update(request: SaveRequest<MaterialsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Delete(request: DeleteRequest, onSuccess?: (response: DeleteResponse) => void, opt?: ServiceOptions<any>): PromiseLike<DeleteResponse>;
    export declare function Retrieve(request: RetrieveRequest, onSuccess?: (response: RetrieveResponse<MaterialsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<RetrieveResponse<MaterialsRow>>;
    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<MaterialsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<MaterialsRow>>;

    export const Methods = {
        Create: "Material/Materials/Create",
        Update: "Material/Materials/Update",
        Delete: "Material/Materials/Delete",
        Retrieve: "Material/Materials/Retrieve",
        List: "Material/Materials/List"
    } as const;

    [
        'Create', 
        'Update', 
        'Delete', 
        'Retrieve', 
        'List'
    ].forEach(x => {
        (<any>MaterialsService)[x] = function (r, s, o) { 
            return serviceRequest(baseUrl + '/' + x, r, s, o); 
        };
    });
}