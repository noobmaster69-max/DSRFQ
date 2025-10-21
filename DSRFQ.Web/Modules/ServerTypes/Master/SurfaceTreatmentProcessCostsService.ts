import { SaveRequest, SaveResponse, ServiceOptions, DeleteRequest, DeleteResponse, RetrieveRequest, RetrieveResponse, ListRequest, ListResponse, serviceRequest } from '@serenity-is/corelib';
import { SurfaceTreatmentProcessCostsRow } from './SurfaceTreatmentProcessCostsRow';

export namespace SurfaceTreatmentProcessCostsService {
    export const baseUrl = 'Master/SurfaceTreatmentProcessCosts';

    export declare function Create(request: SaveRequest<SurfaceTreatmentProcessCostsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Update(request: SaveRequest<SurfaceTreatmentProcessCostsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Delete(request: DeleteRequest, onSuccess?: (response: DeleteResponse) => void, opt?: ServiceOptions<any>): PromiseLike<DeleteResponse>;
    export declare function Retrieve(request: RetrieveRequest, onSuccess?: (response: RetrieveResponse<SurfaceTreatmentProcessCostsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<RetrieveResponse<SurfaceTreatmentProcessCostsRow>>;
    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<SurfaceTreatmentProcessCostsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<SurfaceTreatmentProcessCostsRow>>;

    export const Methods = {
        Create: "Master/SurfaceTreatmentProcessCosts/Create",
        Update: "Master/SurfaceTreatmentProcessCosts/Update",
        Delete: "Master/SurfaceTreatmentProcessCosts/Delete",
        Retrieve: "Master/SurfaceTreatmentProcessCosts/Retrieve",
        List: "Master/SurfaceTreatmentProcessCosts/List"
    } as const;

    [
        'Create', 
        'Update', 
        'Delete', 
        'Retrieve', 
        'List'
    ].forEach(x => {
        (<any>SurfaceTreatmentProcessCostsService)[x] = function (r, s, o) { 
            return serviceRequest(baseUrl + '/' + x, r, s, o); 
        };
    });
}