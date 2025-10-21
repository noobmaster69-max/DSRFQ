import { SaveRequest, SaveResponse, ServiceOptions, DeleteRequest, DeleteResponse, RetrieveRequest, RetrieveResponse, ListRequest, ListResponse, serviceRequest } from "@serenity-is/corelib";
import { GroupsRow } from "./GroupsRow";

export namespace GroupsService {
    export const baseUrl = 'Company/Groups';

    export declare function Create(request: SaveRequest<GroupsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Update(request: SaveRequest<GroupsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Delete(request: DeleteRequest, onSuccess?: (response: DeleteResponse) => void, opt?: ServiceOptions<any>): PromiseLike<DeleteResponse>;
    export declare function Retrieve(request: RetrieveRequest, onSuccess?: (response: RetrieveResponse<GroupsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<RetrieveResponse<GroupsRow>>;
    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<GroupsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<GroupsRow>>;

    export const Methods = {
        Create: "Company/Groups/Create",
        Update: "Company/Groups/Update",
        Delete: "Company/Groups/Delete",
        Retrieve: "Company/Groups/Retrieve",
        List: "Company/Groups/List"
    } as const;

    [
        'Create', 
        'Update', 
        'Delete', 
        'Retrieve', 
        'List'
    ].forEach(x => {
        (<any>GroupsService)[x] = function (r, s, o) {
            return serviceRequest(baseUrl + '/' + x, r, s, o);
        };
    });
}