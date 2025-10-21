import { SaveRequest, SaveResponse, ServiceOptions, DeleteRequest, DeleteResponse, RetrieveRequest, RetrieveResponse, ListRequest, ListResponse, serviceRequest } from '@serenity-is/corelib';
import { CurrenciesRow } from './CurrenciesRow';

export namespace CurrenciesService {
    export const baseUrl = 'Master/Currencies';

    export declare function Create(request: SaveRequest<CurrenciesRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Update(request: SaveRequest<CurrenciesRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Delete(request: DeleteRequest, onSuccess?: (response: DeleteResponse) => void, opt?: ServiceOptions<any>): PromiseLike<DeleteResponse>;
    export declare function Retrieve(request: RetrieveRequest, onSuccess?: (response: RetrieveResponse<CurrenciesRow>) => void, opt?: ServiceOptions<any>): PromiseLike<RetrieveResponse<CurrenciesRow>>;
    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<CurrenciesRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<CurrenciesRow>>;

    export const Methods = {
        Create: "Master/Currencies/Create",
        Update: "Master/Currencies/Update",
        Delete: "Master/Currencies/Delete",
        Retrieve: "Master/Currencies/Retrieve",
        List: "Master/Currencies/List"
    } as const;

    [
        'Create', 
        'Update', 
        'Delete', 
        'Retrieve', 
        'List'
    ].forEach(x => {
        (<any>CurrenciesService)[x] = function (r, s, o) { 
            return serviceRequest(baseUrl + '/' + x, r, s, o); 
        };
    });
}