import { ListResponse } from "@serenity-is/corelib";
import { UserPermissionRow } from "./UserPermissionRow";

export interface UserPermissionListResponse extends ListResponse<UserPermissionRow> {
    RolePermissions?: string[];
}