import { IntegerEditor, StringEditor, BooleanEditor, PrefixedContext, initFormType } from "@serenity-is/corelib";

export interface UserInvitationsForm {
    InvitedByUserId: IntegerEditor;
    EmailAddress: StringEditor;
    Accepted: BooleanEditor;
}

export class UserInvitationsForm extends PrefixedContext {
    static readonly formKey = 'Administration.UserInvitations';
    private static init: boolean;

    constructor(prefix: string) {
        super(prefix);

        if (!UserInvitationsForm.init)  {
            UserInvitationsForm.init = true;

            var w0 = IntegerEditor;
            var w1 = StringEditor;
            var w2 = BooleanEditor;

            initFormType(UserInvitationsForm, [
                'InvitedByUserId', w0,
                'EmailAddress', w1,
                'Accepted', w2
            ]);
        }
    }
}