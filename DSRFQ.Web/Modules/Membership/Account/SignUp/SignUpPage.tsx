import { deepClone, informationDialog, PropertyPanel, resolveUrl, serviceCall, WidgetProps } from "@serenity-is/corelib";
import { SignUpForm, SignupPageModel, SignUpRequest } from "../../../ServerTypes/Membership";
import { SignUpResponse } from "../../../ServerTypes/Membership/SignUpResponse";
import { MembershipValidationTexts, SignUpFormTexts } from "../../../ServerTypes/Texts";
import { AccountPanelTitle } from "../AccountPanelTitle";

export default function pageInit(opt: SignupPageModel) {
    new SignUpPanel({ element: "#SignUpPanel", ...opt });
}

class SignUpPanel extends PropertyPanel<SignUpRequest, SignupPageModel> {

    protected getFormKey() { return SignUpForm.formKey; }

    declare private formInfo: HTMLElement;
    private invitationId: number;
    constructor(props: WidgetProps<SignupPageModel>) {
        super(props);

        const form = new SignUpForm(this.idPrefix);
        if(props.Email!=undefined){
            form.Email.value = props.Email
            form.ConfirmEmail.value = props.Email;
            form.Email.domNode.setAttribute("readonly", "readonly");
            form.ConfirmEmail.domNode.setAttribute("readonly", "readonly");
        }
        if(props.InvitationId!=undefined){
            this.invitationId = props.InvitationId;
        }
        

        form.Email.domNode.setAttribute("autocomplete", "off");
        form.Password.domNode.setAttribute("autocomplete", "new-password");
        form.ConfirmPassword.domNode.setAttribute("autocomplete", "new-password");

        form.ConfirmEmail.addValidationRule(this.uniqueName, () => {
            if (form.ConfirmEmail.value !== form.Email.value) {
                return MembershipValidationTexts.EmailConfirm;
            }
        });

        form.ConfirmPassword.addValidationRule(this.uniqueName, () => {
            if (form.ConfirmPassword.value !== form.Password.value) {
                return MembershipValidationTexts.PasswordConfirmMismatch;
            }
        });

        if (this.options.ExternalProviderToken) {
            form.DisplayName.value = this.options.DisplayName;
            form.Email.value = this.options.Email;
            form.ConfirmEmail.value = this.options.Email;
            this.formInfo.textContent = SignUpFormTexts.ConfirmDetails;
        }
    }

    override getPropertyItems() {
        var items = super.getPropertyItems();
        if (this.options.ExternalProviderToken) {
            var items = deepClone(items);
            for (var x of items.filter(x => x.name == "Password" || x.name == "ConfirmPassword")) {
                x.visible = false;
            }
        }
        return items;
    }

    submitClick() {
        if (!this.validateForm()) {
            return;
        }

        var request = this.propertyGrid.save();
        delete request.ConfirmEmail;
        delete request.ConfirmPassword;
        if(!this.invitationId!=undefined){
            request.UserInvitationId = this.invitationId;
        }

        serviceCall({
            url: resolveUrl('~/Account/SignUp'),
            request: { ...request, ExternalProviderToken: this.options.ExternalProviderToken },
            onSuccess: (response: SignUpResponse) => {
                if (response.DemoActivationLink) {
                    informationDialog("You would normally receive an email with instructions to active your account now.\n\n" +
                        "But as this is a DEMO, you'll be redirected to the activation page automatically. ", () => {
                            redirectTo(response.DemoActivationLink);
                        });

                    return;
                }

                if (response.NeedsActivation) {
                    informationDialog(SignUpFormTexts.Success, () => {
                        redirectTo('~/');
                    });
                }
                else {
                    redirectTo('~/');
                }
            }
        });
    }

    renderContents() {
        const id = this.useIdPrefix();
        return (<>
            <AccountPanelTitle />

            <div class="s-Panel p-4">
                <h5 class="text-center my-4">{SignUpFormTexts.FormTitle}</h5>
                <p id={id.FormInfo} class="text-center" ref={w => this.formInfo = w}>{SignUpFormTexts.FormInfo}</p>

                <form id={id.Form} action="" autoComplete="off">
                    <input autoComplete="false" name="hidden" type="text" style="display:none;" />
                    <div id={id.PropertyGrid}></div>
                    <div class="px-field">
                        <button id={id.SubmitButton} type="submit" class="btn btn-primary my-4 w-100"
                            onClick={e => { e.preventDefault(); this.submitClick(); }}>
                            {SignUpFormTexts.SubmitButton}
                        </button>
                    </div>
                </form>
            </div>
        </>)
    }
}

function redirectTo(url: string) {
    setTimeout(() => {
        window.location.href = resolveUrl(url);
    }, 0);
}