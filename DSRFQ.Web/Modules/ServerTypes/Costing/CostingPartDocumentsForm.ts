import { PrefixedContext, IntegerEditor, StringEditor, DateEditor, initFormType } from '@serenity-is/corelib';

export interface CostingPartDocumentsForm {
    CostingPartId: IntegerEditor;
    FileDirectory: StringEditor;
    FileName: StringEditor;
    Type: IntegerEditor;
    InsertDate: DateEditor;
    InsertUserId: IntegerEditor;
    UpdateDate: DateEditor;
    UpdateUserId: IntegerEditor;
    DeleteDate: DateEditor;
    DeleteUserId: IntegerEditor;
    IsActive: IntegerEditor;
}

export class CostingPartDocumentsForm extends PrefixedContext {
    static readonly formKey = 'Costing.CostingPartDocuments';
    private static init: boolean;
    
    constructor(prefix: string) {
        super(prefix);
        if (!CostingPartDocumentsForm.init)  {
            CostingPartDocumentsForm.init = true;
            
            var w0 = IntegerEditor;
            var w1 = StringEditor;
            var w2 = DateEditor;

            initFormType(CostingPartDocumentsForm, [
            'CostingPartId', w0,
            'FileDirectory', w1,
            'FileName', w1,
            'Type', w0,
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