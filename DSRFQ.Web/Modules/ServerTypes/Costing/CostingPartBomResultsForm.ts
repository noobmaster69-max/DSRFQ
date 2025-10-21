import { PrefixedContext, IntegerEditor, StringEditor, DecimalEditor, DateEditor, initFormType } from '@serenity-is/corelib';

export interface CostingPartBomResultsForm {
    CostingPartId: IntegerEditor;
    PartNumber: StringEditor;
    Description: StringEditor;
    Quantity: DecimalEditor;
    InternalEngineeringNumber: StringEditor;
    IsManual: IntegerEditor;
    InsertDate: DateEditor;
    InsertUserId: IntegerEditor;
    UpdateDate: DateEditor;
    UpdateUserId: IntegerEditor;
    DeleteDate: DateEditor;
    DeleteUserId: IntegerEditor;
    IsActive: IntegerEditor;
}

export class CostingPartBomResultsForm extends PrefixedContext {
    static readonly formKey = 'Costing.CostingPartBomResults';
    private static init: boolean;
    
    constructor(prefix: string) {
        super(prefix);
        if (!CostingPartBomResultsForm.init)  {
            CostingPartBomResultsForm.init = true;
            
            var w0 = IntegerEditor;
            var w1 = StringEditor;
            var w2 = DecimalEditor;
            var w3 = DateEditor;

            initFormType(CostingPartBomResultsForm, [
            'CostingPartId', w0,
            'PartNumber', w1,
            'Description', w1,
            'Quantity', w2,
            'InternalEngineeringNumber', w1,
            'IsManual', w0,
            'InsertDate', w3,
            'InsertUserId', w0,
            'UpdateDate', w3,
            'UpdateUserId', w0,
            'DeleteDate', w3,
            'DeleteUserId', w0,
            'IsActive', w0,
            ]);
        }
    }
}