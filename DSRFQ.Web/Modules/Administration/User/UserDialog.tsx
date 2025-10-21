import { Decorators, EditorUtils, EntityDialog, WidgetProps, faIcon } from "@serenity-is/corelib";
import { addPasswordStrengthValidation } from "@serenity-is/extensions";
import { UserForm, UserRow, UserService } from "../../ServerTypes/Administration";
import { MembershipValidationTexts, UserDialogTexts } from "../../ServerTypes/Texts";
import { UserPermissionDialog } from "../UserPermission/UserPermissionDialog";

@Decorators.registerClass("DSRFQ.Administration.UserDialog")
export class UserDialog<P = {}> extends EntityDialog<UserRow, P> {
    protected override getFormKey() { return UserForm.formKey; }
    protected override getIdProperty() { return UserRow.idProperty; }
    protected override getIsActiveProperty() { return UserRow.isActiveProperty; }
    protected override getLocalTextPrefix() { return UserRow.localTextPrefix; }
    protected override getNameProperty() { return UserRow.nameProperty; }
    protected override getService() { return UserService.baseUrl; }

    protected form = new UserForm(this.idPrefix);

    constructor(props: WidgetProps<P>) {
        super(props);

        this.form.Password.domNode.setAttribute("autocomplete", "new-password");

        addPasswordStrengthValidation(this.form.Password, this.uniqueName);

        this.form.Password.change(() => EditorUtils.setRequired(this.form.PasswordConfirm, this.form.Password.value.length > 0));

        this.form.PasswordConfirm.addValidationRule(this.uniqueName, e => {
            if (this.form.Password.value != this.form.PasswordConfirm.value)
                return MembershipValidationTexts.PasswordConfirmMismatch;
        });
    }

    protected getToolbarButtons() {
        let buttons = super.getToolbarButtons();

        buttons.push({
            title: UserDialogTexts.EditPermissionsButton,
            cssClass: 'edit-permissions-button',
            disabled: this.isNewOrDeleted.bind(this),
            icon: faIcon("lock", "success"),
            onClick: () => {
                UserPermissionDialog({
                    userID: this.entity.UserId,
                    username: this.entity.Username
                });
            }
        });

        return buttons;
    }

    protected afterLoadEntity() {
        super.afterLoadEntity();

        // these fields are only required in new record mode
        EditorUtils.setRequired(this.form.Password, this.isNew());
        EditorUtils.setRequired(this.form.PasswordConfirm, this.isNew());
    }
}