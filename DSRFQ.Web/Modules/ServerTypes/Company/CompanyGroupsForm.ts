import { IntegerEditor, ServiceLookupEditor, PrefixedContext, initFormType } from "@serenity-is/corelib";

export interface CompanyGroupsForm {
    CompanyId: IntegerEditor;
    GroupId: ServiceLookupEditor;
}

export class CompanyGroupsForm extends PrefixedContext {
    static readonly formKey = 'Company.CompanyGroups';
    private static init: boolean;

    constructor(prefix: string) {
        super(prefix);

        if (!CompanyGroupsForm.init)  {
            CompanyGroupsForm.init = true;

            var w0 = IntegerEditor;
            var w1 = ServiceLookupEditor;

            initFormType(CompanyGroupsForm, [
                'CompanyId', w0,
                'GroupId', w1
            ]);
        }
    }
}