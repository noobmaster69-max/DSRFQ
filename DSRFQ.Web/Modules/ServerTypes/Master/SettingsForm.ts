import { BooleanEditor, DecimalEditor, StringEditor, PrefixedContext, initFormType } from "@serenity-is/corelib";

export interface SettingsForm {
    DatumAddMissing: BooleanEditor;
    DatumAddMinConfidence: DecimalEditor;
    SubNumberSeparator: StringEditor;
}

export class SettingsForm extends PrefixedContext {
    static readonly formKey = 'Master.Settings';
    private static init: boolean;

    constructor(prefix: string) {
        super(prefix);

        if (!SettingsForm.init) {
            SettingsForm.init = true;

            var w0 = BooleanEditor;
            var w1 = DecimalEditor;
            var w2 = StringEditor;

            initFormType(SettingsForm, [
                'DatumAddMissing', w0,
                'DatumAddMinConfidence', w1,
                'SubNumberSeparator', w2
            ]);
        }
    }
}
