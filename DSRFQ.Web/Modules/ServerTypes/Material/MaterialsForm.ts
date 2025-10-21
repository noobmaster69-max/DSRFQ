import { PrefixedContext, IntegerEditor, StringEditor, DecimalEditor, DateEditor, initFormType } from '@serenity-is/corelib';

export interface MaterialsForm {
    Code: StringEditor;
    Name: StringEditor;
    Description: StringEditor;
    Density: DecimalEditor;
    DimensionUnitId: IntegerEditor;
    CompanyId: IntegerEditor;
    InsertDate: DateEditor;
    InsertUserId: IntegerEditor;
    UpdateDate: DateEditor;
    UpdateUserId: IntegerEditor;
    DeleteDate: DateEditor;
    DeleteUserId: IntegerEditor;
    IsActive: IntegerEditor;
}

export class MaterialsForm extends PrefixedContext {
    static readonly formKey = 'Material.Materials';
    private static init: boolean;
    
    constructor(prefix: string) {
        super(prefix);
        if (!MaterialsForm.init)  {
            MaterialsForm.init = true;
            
            var w0 = IntegerEditor;
            var w1 = StringEditor;
            var w2 = DecimalEditor;
            var w3 = DateEditor;

            initFormType(MaterialsForm, [
            'Code', w1,
            'Name', w1,
            'Description', w1,
            'Density', w2,
            'DimensionUnitId', w0,
            'CompanyId', w0,
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