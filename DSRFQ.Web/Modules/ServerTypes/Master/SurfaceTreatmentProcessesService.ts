import { SaveRequest, SaveResponse, ServiceOptions, DeleteRequest, DeleteResponse, RetrieveRequest, RetrieveResponse, ListRequest, ListResponse, serviceRequest } from '@serenity-is/corelib';
import { SurfaceTreatmentProcessesRow } from './SurfaceTreatmentProcessesRow';

export namespace SurfaceTreatmentProcessesService {
    export const baseUrl = 'Master/SurfaceTreatmentProcesses';

    export declare function Create(request: SaveRequest<SurfaceTreatmentProcessesRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Update(request: SaveRequest<SurfaceTreatmentProcessesRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Delete(request: DeleteRequest, onSuccess?: (response: DeleteResponse) => void, opt?: ServiceOptions<any>): PromiseLike<DeleteResponse>;
    export declare function Retrieve(request: RetrieveRequest, onSuccess?: (response: RetrieveResponse<SurfaceTreatmentProcessesRow>) => void, opt?: ServiceOptions<any>): PromiseLike<RetrieveResponse<SurfaceTreatmentProcessesRow>>;
    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<SurfaceTreatmentProcessesRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<SurfaceTreatmentProcessesRow>>;

    export const Methods = {
        Create: "Master/SurfaceTreatmentProcesses/Create",
        Update: "Master/SurfaceTreatmentProcesses/Update",
        Delete: "Master/SurfaceTreatmentProcesses/Delete",
        Retrieve: "Master/SurfaceTreatmentProcesses/Retrieve",
        List: "Master/SurfaceTreatmentProcesses/List"
    } as const;

    [
        'Create', 
        'Update', 
        'Delete', 
        'Retrieve', 
        'List'
    ].forEach(x => {
        (<any>SurfaceTreatmentProcessesService)[x] = function (r, s, o) { 
            return serviceRequest(baseUrl + '/' + x, r, s, o); 
        };
    });
}