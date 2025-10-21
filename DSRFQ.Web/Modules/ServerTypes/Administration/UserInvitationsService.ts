import { SaveRequest, SaveResponse, ServiceOptions, DeleteRequest, DeleteResponse, RetrieveRequest, RetrieveResponse, ListRequest, ListResponse, serviceRequest } from "@serenity-is/corelib";
import { UserInvitationsRow } from "./UserInvitationsRow";

export namespace UserInvitationsService {
    export const baseUrl = 'Administration/UserInvitations';

    export declare function Create(request: SaveRequest<UserInvitationsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Update(request: SaveRequest<UserInvitationsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Delete(request: DeleteRequest, onSuccess?: (response: DeleteResponse) => void, opt?: ServiceOptions<any>): PromiseLike<DeleteResponse>;
    export declare function Retrieve(request: RetrieveRequest, onSuccess?: (response: RetrieveResponse<UserInvitationsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<RetrieveResponse<UserInvitationsRow>>;
    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<UserInvitationsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<UserInvitationsRow>>;

    export const Methods = {
        Create: "Administration/UserInvitations/Create",
        Update: "Administration/UserInvitations/Update",
        Delete: "Administration/UserInvitations/Delete",
        Retrieve: "Administration/UserInvitations/Retrieve",
        List: "Administration/UserInvitations/List"
    } as const;

    [
        'Create', 
        'Update', 
        'Delete', 
        'Retrieve', 
        'List'
    ].forEach(x => {
        (<any>UserInvitationsService)[x] = function (r, s, o) {
            return serviceRequest(baseUrl + '/' + x, r, s, o);
        };
    });
}