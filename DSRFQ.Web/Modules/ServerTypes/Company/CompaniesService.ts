import { SaveRequest, SaveResponse, ServiceOptions, DeleteRequest, DeleteResponse, RetrieveRequest, RetrieveResponse, ListRequest, ListResponse, serviceRequest } from "@serenity-is/corelib";
import { CompaniesRow } from "./CompaniesRow";

export namespace CompaniesService {
    export const baseUrl = 'Company/Companies';

    export declare function Create(request: SaveRequest<CompaniesRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Update(request: SaveRequest<CompaniesRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Delete(request: DeleteRequest, onSuccess?: (response: DeleteResponse) => void, opt?: ServiceOptions<any>): PromiseLike<DeleteResponse>;
    export declare function Retrieve(request: RetrieveRequest, onSuccess?: (response: RetrieveResponse<CompaniesRow>) => void, opt?: ServiceOptions<any>): PromiseLike<RetrieveResponse<CompaniesRow>>;
    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<CompaniesRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<CompaniesRow>>;

    export const Methods = {
        Create: "Company/Companies/Create",
        Update: "Company/Companies/Update",
        Delete: "Company/Companies/Delete",
        Retrieve: "Company/Companies/Retrieve",
        List: "Company/Companies/List"
    } as const;

    [
        'Create', 
        'Update', 
        'Delete', 
        'Retrieve', 
        'List'
    ].forEach(x => {
        (<any>CompaniesService)[x] = function (r, s, o) {
            return serviceRequest(baseUrl + '/' + x, r, s, o);
        };
    });
}