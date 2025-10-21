import { SaveRequest, SaveResponse, ServiceOptions, DeleteRequest, DeleteResponse, RetrieveRequest, RetrieveResponse, ListRequest, ListResponse, serviceRequest } from '@serenity-is/corelib';
import { VolumeUnitsRow } from './VolumeUnitsRow';

export namespace VolumeUnitsService {
    export const baseUrl = 'Master/VolumeUnits';

    export declare function Create(request: SaveRequest<VolumeUnitsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Update(request: SaveRequest<VolumeUnitsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Delete(request: DeleteRequest, onSuccess?: (response: DeleteResponse) => void, opt?: ServiceOptions<any>): PromiseLike<DeleteResponse>;
    export declare function Retrieve(request: RetrieveRequest, onSuccess?: (response: RetrieveResponse<VolumeUnitsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<RetrieveResponse<VolumeUnitsRow>>;
    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<VolumeUnitsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<VolumeUnitsRow>>;

    export const Methods = {
        Create: "Master/VolumeUnits/Create",
        Update: "Master/VolumeUnits/Update",
        Delete: "Master/VolumeUnits/Delete",
        Retrieve: "Master/VolumeUnits/Retrieve",
        List: "Master/VolumeUnits/List"
    } as const;

    [
        'Create', 
        'Update', 
        'Delete', 
        'Retrieve', 
        'List'
    ].forEach(x => {
        (<any>VolumeUnitsService)[x] = function (r, s, o) { 
            return serviceRequest(baseUrl + '/' + x, r, s, o); 
        };
    });
}