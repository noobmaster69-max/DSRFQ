import { PrefixedContext, IntegerEditor, DecimalEditor, DateEditor, initFormType } from '@serenity-is/corelib';

export interface RawMaterialCostsForm {
    MaterialId: IntegerEditor;
    MaterialTemperId: IntegerEditor;
    MaterialShapeId: IntegerEditor;
    WeightDimensionUnitId: IntegerEditor;
    CurrencyId: IntegerEditor;
    UnitPrice: DecimalEditor;
    FromDate: DateEditor;
    ToDate: DateEditor;
    CompanyId: IntegerEditor;
    GroupId: IntegerEditor;
    InsertDate: DateEditor;
    InsertUserId: IntegerEditor;
    UpdateDate: DateEditor;
    UpdateUserId: IntegerEditor;
    DeleteDate: DateEditor;
    DeleteUserId: IntegerEditor;
    IsActive: IntegerEditor;
}

export class RawMaterialCostsForm extends PrefixedContext {
    static readonly formKey = 'Material.RawMaterialCosts';
    private static init: boolean;
    
    constructor(prefix: string) {
        super(prefix);
        if (!RawMaterialCostsForm.init)  {
            RawMaterialCostsForm.init = true;
            
            var w0 = IntegerEditor;
            var w1 = DecimalEditor;
            var w2 = DateEditor;

            initFormType(RawMaterialCostsForm, [
            'MaterialId', w0,
            'MaterialTemperId', w0,
            'MaterialShapeId', w0,
            'WeightDimensionUnitId', w0,
            'CurrencyId', w0,
            'UnitPrice', w1,
            'FromDate', w2,
            'ToDate', w2,
            'CompanyId', w0,
            'GroupId', w0,
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