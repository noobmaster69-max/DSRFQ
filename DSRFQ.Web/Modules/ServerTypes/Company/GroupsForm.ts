import { StringEditor, LookupEditor, PrefixedContext, initFormType } from "@serenity-is/corelib";

export interface GroupsForm {
    Name: StringEditor;
    Description: StringEditor;
    CompanyList: LookupEditor;
}

export class GroupsForm extends PrefixedContext {
    static readonly formKey = 'Company.Groups';
    private static init: boolean;

    constructor(prefix: string) {
        super(prefix);

        if (!GroupsForm.init)  {
            GroupsForm.init = true;

            var w0 = StringEditor;
            var w1 = LookupEditor;

            initFormType(GroupsForm, [
                'Name', w0,
                'Description', w0,
                'CompanyList', w1
            ]);
        }
    }
}