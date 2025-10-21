import { SaveRequest, SaveResponse, ServiceOptions, DeleteRequest, DeleteResponse, RetrieveRequest, RetrieveResponse, ListRequest, ListResponse, serviceRequest } from "@serenity-is/corelib";
import { CompanyGroupsRow } from "./CompanyGroupsRow";

export namespace CompanyGroupsService {
    export const baseUrl = 'Company/CompanyGroups';

    export declare function Create(request: SaveRequest<CompanyGroupsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Update(request: SaveRequest<CompanyGroupsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Delete(request: DeleteRequest, onSuccess?: (response: DeleteResponse) => void, opt?: ServiceOptions<any>): PromiseLike<DeleteResponse>;
    export declare function Retrieve(request: RetrieveRequest, onSuccess?: (response: RetrieveResponse<CompanyGroupsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<RetrieveResponse<CompanyGroupsRow>>;
    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<CompanyGroupsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<CompanyGroupsRow>>;

    export const Methods = {
        Create: "Company/CompanyGroups/Create",
        Update: "Company/CompanyGroups/Update",
        Delete: "Company/CompanyGroups/Delete",
        Retrieve: "Company/CompanyGroups/Retrieve",
        List: "Company/CompanyGroups/List"
    } as const;

    [
        'Create', 
        'Update', 
        'Delete', 
        'Retrieve', 
        'List'
    ].forEach(x => {
        (<any>CompanyGroupsService)[x] = function (r, s, o) {
            return serviceRequest(baseUrl + '/' + x, r, s, o);
        };
    });
}