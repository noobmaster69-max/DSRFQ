import { SaveRequest, SaveResponse, ServiceOptions, DeleteRequest, DeleteResponse, RetrieveRequest, RetrieveResponse, ListRequest, ListResponse, serviceRequest } from '@serenity-is/corelib';
import { WeightUnitsRow } from './WeightUnitsRow';

export namespace WeightUnitsService {
    export const baseUrl = 'Master/WeightUnits';

    export declare function Create(request: SaveRequest<WeightUnitsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Update(request: SaveRequest<WeightUnitsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Delete(request: DeleteRequest, onSuccess?: (response: DeleteResponse) => void, opt?: ServiceOptions<any>): PromiseLike<DeleteResponse>;
    export declare function Retrieve(request: RetrieveRequest, onSuccess?: (response: RetrieveResponse<WeightUnitsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<RetrieveResponse<WeightUnitsRow>>;
    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<WeightUnitsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<WeightUnitsRow>>;

    export const Methods = {
        Create: "Master/WeightUnits/Create",
        Update: "Master/WeightUnits/Update",
        Delete: "Master/WeightUnits/Delete",
        Retrieve: "Master/WeightUnits/Retrieve",
        List: "Master/WeightUnits/List"
    } as const;

    [
        'Create', 
        'Update', 
        'Delete', 
        'Retrieve', 
        'List'
    ].forEach(x => {
        (<any>WeightUnitsService)[x] = function (r, s, o) { 
            return serviceRequest(baseUrl + '/' + x, r, s, o); 
        };
    });
}