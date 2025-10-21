import { EntityGrid } from "@serenity-is/corelib";
import { RoleColumns, RoleRow, RoleService } from "../../ServerTypes/Administration";
import { RoleDialog } from "./RoleDialog";

export class RoleGrid extends EntityGrid<RoleRow> {
    protected override getColumnsKey() { return RoleColumns.columnsKey; }
    protected override getDialogType() { return RoleDialog; }
    protected override getRowDefinition() { return RoleRow; }
    protected override getService() { return RoleService.baseUrl; }
}
