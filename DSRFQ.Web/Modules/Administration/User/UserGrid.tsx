import { EntityGrid, faIcon, resolveUrl } from "@serenity-is/corelib";
import { RoleRow, UserColumns, UserRow, UserService } from "../../ServerTypes/Administration";
import { UserDialog } from "./UserDialog";

export class UserGrid<P = {}> extends EntityGrid<UserRow, P> {
    protected override getColumnsKey() { return UserColumns.columnsKey; }
    protected override getDialogType() { return UserDialog; }
    protected override getIdProperty() { return UserRow.idProperty; }
    protected override getIsActiveProperty() { return UserRow.isActiveProperty; }
    protected override getLocalTextPrefix() { return UserRow.localTextPrefix; }
    protected override getService() { return UserService.baseUrl; }

    protected override createIncludeDeletedButton() { }

    protected override getColumns() {
        let columns = new UserColumns(super.getColumns());

        columns.ImpersonationToken && (columns.ImpersonationToken.format = ctx => !ctx.value ? "" :
            <a target="_blank" href={resolveUrl(`~/Account/ImpersonateAs?token=${encodeURIComponent(ctx.value)}`)}>
                <i class={faIcon("user-secret", "primary")}></i>
            </a>);

        columns.Roles && (columns.Roles.format = ctx => !ctx?.value?.length ? "" : <span ref={async el => {
            let lookup = await RoleRow.getLookupAsync();
            let roleList = ctx.value.map((x: number) => (lookup.itemById[x] || {}).RoleName || "");
            roleList.sort();
            el.textContent = roleList.join(", ");
        }}><i class={faIcon("spinner")}></i></span>)

        return columns.valueOf();
    }
}
