import { StringEditor, PrefixedContext, initFormType } from "@serenity-is/corelib";

export interface CompaniesForm {
    Name: StringEditor;
    Picture: StringEditor;
    OrganizationId: StringEditor;
}

export class CompaniesForm extends PrefixedContext {
    static readonly formKey = 'Company.Companies';
    private static init: boolean;

    constructor(prefix: string) {
        super(prefix);

        if (!CompaniesForm.init)  {
            CompaniesForm.init = true;

            var w0 = StringEditor;

            initFormType(CompaniesForm, [
                'Name', w0,
                'Picture', w0,
                'OrganizationId', w0
            ]);
        }
    }
}