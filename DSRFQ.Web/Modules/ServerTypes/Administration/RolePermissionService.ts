import { ServiceOptions, serviceRequest } from "@serenity-is/corelib";
import { RolePermissionListRequest } from "./RolePermissionListRequest";
import { RolePermissionListResponse } from "./RolePermissionListResponse";
import { RolePermissionUpdateRequest } from "./RolePermissionUpdateRequest";
import { RolePermissionUpdateResponse } from "./RolePermissionUpdateResponse";

export namespace RolePermissionService {
    export const baseUrl = 'Administration/RolePermission';

    export declare function Update(request: RolePermissionUpdateRequest, onSuccess?: (response: RolePermissionUpdateResponse) => void, opt?: ServiceOptions<any>): PromiseLike<RolePermissionUpdateResponse>;
    export declare function List(request: RolePermissionListRequest, onSuccess?: (response: RolePermissionListResponse) => void, opt?: ServiceOptions<any>): PromiseLike<RolePermissionListResponse>;

    export const Methods = {
        Update: "Administration/RolePermission/Update",
        List: "Administration/RolePermission/List"
    } as const;

    [
        'Update', 
        'List'
    ].forEach(x => {
        (<any>RolePermissionService)[x] = function (r, s, o) {
            return serviceRequest(baseUrl + '/' + x, r, s, o);
        };
    });
}