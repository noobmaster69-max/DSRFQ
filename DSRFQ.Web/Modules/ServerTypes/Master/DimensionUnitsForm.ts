import { PrefixedContext, IntegerEditor, StringEditor, DateEditor, initFormType } from '@serenity-is/corelib';

export interface DimensionUnitsForm {
    Code: StringEditor;
    Name: StringEditor;
    InsertDate: DateEditor;
    InsertUserId: IntegerEditor;
    UpdateDate: DateEditor;
    UpdateUserId: IntegerEditor;
    DeleteDate: DateEditor;
    DeleteUserId: IntegerEditor;
    IsActive: IntegerEditor;
}

export class DimensionUnitsForm extends PrefixedContext {
    static readonly formKey = 'Master.DimensionUnits';
    private static init: boolean;
    
    constructor(prefix: string) {
        super(prefix);
        if (!DimensionUnitsForm.init)  {
            DimensionUnitsForm.init = true;
            
            var w0 = IntegerEditor;
            var w1 = StringEditor;
            var w2 = DateEditor;

            initFormType(DimensionUnitsForm, [
            'Code', w1,
            'Name', w1,
            'InsertDate', w2,
            'InsertUserId', w0,
            'UpdateDate', w2,
            'UpdateUserId', w0,
            'DeleteDate', w2,
            'DeleteUserId', w0,
            'IsActive', w0,
            ]);
        }
    }
}