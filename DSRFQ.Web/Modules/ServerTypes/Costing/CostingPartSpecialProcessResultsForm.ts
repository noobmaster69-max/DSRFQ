import { PrefixedContext, IntegerEditor, StringEditor, DateEditor, initFormType } from '@serenity-is/corelib';

export interface CostingPartSpecialProcessResultsForm {
    CostingPartId: IntegerEditor;
    SpecialProcessName: StringEditor;
    SpecialProcessId: IntegerEditor;
    IsManual: IntegerEditor;
    InsertDate: DateEditor;
    InsertUserId: IntegerEditor;
    UpdateDate: DateEditor;
    UpdateUserId: IntegerEditor;
    DeleteDate: DateEditor;
    DeleteUserId: IntegerEditor;
    IsActive: IntegerEditor;
}

export class CostingPartSpecialProcessResultsForm extends PrefixedContext {
    static readonly formKey = 'Costing.CostingPartSpecialProcessResults';
    private static init: boolean;
    
    constructor(prefix: string) {
        super(prefix);
        if (!CostingPartSpecialProcessResultsForm.init)  {
            CostingPartSpecialProcessResultsForm.init = true;
            
            var w0 = IntegerEditor;
            var w1 = StringEditor;
            var w2 = DateEditor;

            initFormType(CostingPartSpecialProcessResultsForm, [
            'CostingPartId', w0,
            'SpecialProcessName', w1,
            'SpecialProcessId', w0,
            'IsManual', w0,
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