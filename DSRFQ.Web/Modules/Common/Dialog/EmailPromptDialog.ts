import { Decorators, notifyError, notifySuccess, BaseDialog} from "@serenity-is/corelib";

@Decorators.registerClass("DSRFQ.Common.EmailPromptDialog")
export class EmailPromptDialog extends BaseDialog<{ onSubmit?: (email: string) => void }> {

    protected getDialogTitle() {
        return "Enter Email Address";
    }

    protected getTemplate() {
        // "~_" prefix is important so Serenity resolves IDs with this.idPrefix
        return `
<div class="p-4">
  <form id="~_Form" novalidate>
    <div class="mb-3">
      <label for="~_Email" class="form-label">Email</label>
      <input type="email" id="~_Email" class="form-control" placeholder="name@example.com" required />
      <div class="invalid-feedback">Please enter a valid email address.</div>
    </div>
  </form>
</div>`;
    }

    protected arrange() {
        super.arrange();
        // focus the input when dialog opens
        setTimeout(() => (this.byId("Email") as HTMLInputElement)?.focus(), 0);
    }

    protected getDialogButtons() {
        return [
            {
                text: "OK",
                click: () => {
                    const input = document.getElementById(this.idPrefix + "Email") as HTMLInputElement;

                    // native HTML5 email validation
                    if (!input.reportValidity()) {
                        return;
                    }
                    const email = (input.value || "").trim();
                    if (!email) {
                        notifyError("Email is required.");
                        return;
                    }
                    this.options?.onSubmit?.(email);
                    this.dialogClose();
                }
            },
            {
                text: "Cancel",
                click: () => this.dialogClose()
            }
        ];
    }
}
