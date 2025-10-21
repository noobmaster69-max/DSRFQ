import { Decorators, EntityDialog, faIcon } from "@serenity-is/corelib";
import { RoleForm, RoleRow, RoleService } from "../../ServerTypes/Administration";
import { RolePermissionDialogTexts } from "../../ServerTypes/Texts";
import { RolePermissionDialog } from "../RolePermission/RolePermissionDialog";

@Decorators.registerClass('DSRFQ.Administration.RoleDialog')
export class RoleDialog<P = {}> extends EntityDialog<RoleRow, P> {
    protected override getFormKey() { return RoleForm.formKey; }
    protected override getRowDefinition() { return RoleRow; }
    protected override getService() { return RoleService.baseUrl; }

    protected override getToolbarButtons() {
        let buttons = super.getToolbarButtons();

        buttons.push({
            title: RolePermissionDialogTexts.EditButton,
            action: "edit-permissions",
            disabled: () => this.isNewOrDeleted(),
            icon: faIcon("lock", "success"),
            onClick: () => {
                RolePermissionDialog({
                    roleID: this.entity.RoleId,
                    roleName: this.entity.RoleName
                });
            }
        });

        return buttons;
    }
}