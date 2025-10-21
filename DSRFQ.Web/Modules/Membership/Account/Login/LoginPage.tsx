import { PropertyPanel, getCookie, getReturnUrl, localText, notifyError, parseDate, resolveUrl, serviceCall, stringFormat, tryGetText } from "@serenity-is/corelib";
import { PromptDialog } from "@serenity-is/extensions";
import { TwoFactorNotifyResponse } from "@serenity-is/pro.extensions";
import { LoginForm, LoginPageModel, LoginRequest } from "../../../ServerTypes/Membership";
import { LoginFormTexts } from "../../../ServerTypes/Texts";
import { AccountPanelTitle } from "../AccountPanelTitle";
import "./LoginPage.css";

export default function pageInit(props: LoginPageModel) {
    return <LoginPanel {...props} element="#LoginPanel" ref={panel => {
        let form = panel.form;
        form.Username.element.attr("autocomplete", "username");
        form.Password.element.attr("autocomplete", "current-password");
        if (props?.ActivatedUser) {
            form.Username.value = props.ActivatedUser;
            form.Password.element.focus();
        }
        //#if (IsPublicDemo)
        else if ((props as any).IsPublicDemo) {
            form.Username.domNode.setAttribute("placeholder", form.Username.value = 'admin');
            form.Password.domNode.setAttribute("placeholder", form.Password.value = 'serenity');
        }
        //#endif*/
    }} />
}

class LoginPanel extends PropertyPanel<LoginRequest, LoginPageModel> {

    protected getFormKey() { return LoginForm.formKey; }

    readonly form = new LoginForm(this.idPrefix);

    protected loginClick() {
        if (!this.validateForm())
            return;

        var request = this.getSaveEntity();

        serviceCall({
            url: resolveUrl('~/Account/Login'),
            request: request,
            onSuccess: redirectToReturnUrl,
            onError: (response) => {
                if (response?.Error?.Code === "TwoFactorAuthenticationRequired") {
                    handleTwoFactorAuth(request.Username, request.Password, JSON.parse(response.Error.Arguments));
                    return true;
                }

                if (response?.Error?.Code === "RedirectUserTo") {
                    window.location.href = response.Error.Arguments;
                    return true;
                }

                if (response?.Error?.Message?.length) {
                    notifyError(response.Error.Message);
                    this.form.Password.element.focus();
                    return true;
                }
            }
        });

    }

    protected renderContents() {
        const id = this.useIdPrefix();
        return (<>
            <AccountPanelTitle />
            <div class="s-Panel p-4">
                <h5 class="text-center my-4">{LoginFormTexts.LoginToYourAccount}</h5>
                <form id={id.Form} action="">
                    <div id={id.PropertyGrid}></div>
                    <div class="px-field">
                        <a class="float-end text-decoration-none" href={resolveUrl('~/Account/ForgotPassword')}>
                            {LoginFormTexts.ForgotPassword}
                        </a>
                    </div>
                    <div class="px-field">
                        <button id={id.LoginButton} type="submit" class="btn btn-primary my-3 w-100"
                            onClick={e => {
                                e.preventDefault();
                                this.loginClick();
                            }}>
                            {LoginFormTexts.SignInButton}
                        </button>
                    </div>
                </form>
            </div>
            <div class="text-center mt-2">
                <a class="text-decoration-none" href={resolveUrl('~/Account/SignUp')}>{LoginFormTexts.SignUpButton}</a>
            </div>
        </>);
    }
}

function handleTwoFactorAuth(user: string, pass: string, notifyResponse: TwoFactorNotifyResponse) {
    var remainingAttempts = notifyResponse.RemainingAttempts;
    var remainingSeconds = Math.floor((parseDate(notifyResponse.Expiration).getTime() - new Date().getTime()) / 1000);
    var dialog: PromptDialog = null;
    let updateTimer: number;
    var showDialog = () => {
        dialog = new PromptDialog({
            title: "Two-factor Authentication",
            editorType: "Integer",
            message: notifyResponse.Prompt,
            isHtml: true,
            required: true,
            validateValue: (x) => {
                remainingAttempts--;
                serviceCall({
                    url: resolveUrl('~/Account/Login'),
                    request: {
                        Username: user,
                        Password: pass,
                        TwoFactorToken: notifyResponse.Token,
                        TwoFactorCode: x?.toString()
                    } satisfies LoginRequest,
                    onSuccess: redirectToReturnUrl,
                    onError: z => {
                        if (remainingAttempts < 0) {
                            notifyError(localText("Site.TwoFactorAuth.OutOfAllowedAttempts"));
                            dialog?.destroy();
                            dialog = null;
                            return;
                        }
                        notifyError(z.Error.Message);
                        showDialog();
                    }
                });

                return true;
            }
        });

        dialog.onClose(() => clearTimeout(updateTimer));
        dialog.dialogOpen();
    };

    function updateCounter() {
        remainingSeconds -= 1;
        if (dialog != null) {
            let counter = (dialog.domNode?.querySelector("span.counter") as HTMLElement);
            counter && (counter.textContent = remainingSeconds.toString());
        }

        if (remainingSeconds >= 0)
            setTimeout(updateCounter, 1000);
        else if (dialog != null)
            dialog.dialogClose("done");
    };

    showDialog();
    updateTimer = window.setTimeout(updateCounter, 1000);
}

function redirectToReturnUrl() {
    window.location.href = getReturnUrl({ purpose: "login" });
}

//#if (OpenIdClient)
const externalLoginColorMap = {
    "Google": "#ea4335",
    "GitHub": "#333",
    "Microsoft": "#0078d7"
}

function ExternalLoginSection({ providers }: { providers: string[] }) {
    let returnUrl = getReturnUrl();
    return <>
        {providers?.length > 0 &&
            <div class="s-horizontal-divider">
                <span>{LoginFormTexts.OR}</span>
            </div>}
        {providers?.map(providerName =>
            <form method="post"
                action={resolveUrl("~/Account/ExternalLogin") + (returnUrl ? "?ReturnUrl=" + encodeURIComponent(returnUrl) : "")}>
                <input hidden name="__RequestVerificationToken" value={getCookie("CSRF-TOKEN")} />
                <div class="px-field">
                    <button type="submit" name="provider" value={providerName}
                        class="btn my-2 w-100 d-flex align-items-center justify-content-center text-white"
                        style={`background-color: ${externalLoginColorMap[providerName] ?? "#6c757d"}`}>
                        <i class={"mx-1 fab fa-lg fa-" + providerName.toLowerCase()} aria-hidden="true"></i>
                        {tryGetText("Forms.Membership.Login.SignInWith" + providerName) ??
                            stringFormat(LoginFormTexts.SignInWithGeneric, providerName)}
                    </button>
                </div>
            </form>)}
    </>
}
//#endif
