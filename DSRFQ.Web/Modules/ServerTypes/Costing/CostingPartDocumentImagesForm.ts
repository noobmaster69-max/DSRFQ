import { PrefixedContext, IntegerEditor, StringEditor, DateEditor, initFormType } from '@serenity-is/corelib';

export interface CostingPartDocumentImagesForm {
    CostingPartDocumentId: IntegerEditor;
    FileDirectory: StringEditor;
    FileName: StringEditor;
    Page: IntegerEditor;
    InsertDate: DateEditor;
    InsertUserId: IntegerEditor;
    UpdateDate: DateEditor;
    UpdateUserId: IntegerEditor;
    DeleteDate: DateEditor;
    DeleteUserId: IntegerEditor;
    IsActive: IntegerEditor;
}

export class CostingPartDocumentImagesForm extends PrefixedContext {
    static readonly formKey = 'Costing.CostingPartDocumentImages';
    private static init: boolean;
    
    constructor(prefix: string) {
        super(prefix);
        if (!CostingPartDocumentImagesForm.init)  {
            CostingPartDocumentImagesForm.init = true;
            
            var w0 = IntegerEditor;
            var w1 = StringEditor;
            var w2 = DateEditor;

            initFormType(CostingPartDocumentImagesForm, [
            'CostingPartDocumentId', w0,
            'FileDirectory', w1,
            'FileName', w1,
            'Page', w0,
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