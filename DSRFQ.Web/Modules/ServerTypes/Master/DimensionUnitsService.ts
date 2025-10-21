import { SaveRequest, SaveResponse, ServiceOptions, DeleteRequest, DeleteResponse, RetrieveRequest, RetrieveResponse, ListRequest, ListResponse, serviceRequest } from '@serenity-is/corelib';
import { DimensionUnitsRow } from './DimensionUnitsRow';

export namespace DimensionUnitsService {
    export const baseUrl = 'Master/DimensionUnits';

    export declare function Create(request: SaveRequest<DimensionUnitsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Update(request: SaveRequest<DimensionUnitsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Delete(request: DeleteRequest, onSuccess?: (response: DeleteResponse) => void, opt?: ServiceOptions<any>): PromiseLike<DeleteResponse>;
    export declare function Retrieve(request: RetrieveRequest, onSuccess?: (response: RetrieveResponse<DimensionUnitsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<RetrieveResponse<DimensionUnitsRow>>;
    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<DimensionUnitsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<DimensionUnitsRow>>;

    export const Methods = {
        Create: "Master/DimensionUnits/Create",
        Update: "Master/DimensionUnits/Update",
        Delete: "Master/DimensionUnits/Delete",
        Retrieve: "Master/DimensionUnits/Retrieve",
        List: "Master/DimensionUnits/List"
    } as const;

    [
        'Create', 
        'Update', 
        'Delete', 
        'Retrieve', 
        'List'
    ].forEach(x => {
        (<any>DimensionUnitsService)[x] = function (r, s, o) { 
            return serviceRequest(baseUrl + '/' + x, r, s, o); 
        };
    });
}