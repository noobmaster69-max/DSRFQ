import { PrefixedContext, IntegerEditor, StringEditor, DateEditor, initFormType } from '@serenity-is/corelib';

export interface CostingStatusForm {
    Name: StringEditor;
    Color: StringEditor;
    InsertDate: DateEditor;
    InsertUserId: IntegerEditor;
    UpdateDate: DateEditor;
    UpdateUserId: IntegerEditor;
    DeleteDate: DateEditor;
    DeleteUserId: IntegerEditor;
    IsActive: IntegerEditor;
}

export class CostingStatusForm extends PrefixedContext {
    static readonly formKey = 'Master.CostingStatus';
    private static init: boolean;
    
    constructor(prefix: string) {
        super(prefix);
        if (!CostingStatusForm.init)  {
            CostingStatusForm.init = true;
            
            var w0 = IntegerEditor;
            var w1 = StringEditor;
            var w2 = DateEditor;

            initFormType(CostingStatusForm, [
            'Name', w1,
            'Color', w1,
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