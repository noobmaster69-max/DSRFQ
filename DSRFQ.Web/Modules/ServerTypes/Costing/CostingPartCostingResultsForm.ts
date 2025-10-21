import { PrefixedContext, IntegerEditor, StringEditor, DecimalEditor, DateEditor, initFormType } from '@serenity-is/corelib';

export interface CostingPartCostingResultsForm {
    CostingPartId: IntegerEditor;
    CostingCategoryId: IntegerEditor;
    Name: StringEditor;
    Description: StringEditor;
    Quantity: DecimalEditor;
    DimensionUnitId: IntegerEditor;
    DimensionUnit: StringEditor;
    UnitPrice: DecimalEditor;
    CurrencyId: IntegerEditor;
    Total: DecimalEditor;
    IsTimeUnit: IntegerEditor;
    IsManual: IntegerEditor;
    InsertDate: DateEditor;
    InsertUserId: IntegerEditor;
    UpdateDate: DateEditor;
    UpdateUserId: IntegerEditor;
    DeleteDate: DateEditor;
    DeleteUserId: IntegerEditor;
    IsActive: IntegerEditor;
}

export class CostingPartCostingResultsForm extends PrefixedContext {
    static readonly formKey = 'Costing.CostingPartCostingResults';
    private static init: boolean;
    
    constructor(prefix: string) {
        super(prefix);
        if (!CostingPartCostingResultsForm.init)  {
            CostingPartCostingResultsForm.init = true;
            
            var w0 = IntegerEditor;
            var w1 = StringEditor;
            var w2 = DecimalEditor;
            var w3 = DateEditor;

            initFormType(CostingPartCostingResultsForm, [
            'CostingPartId', w0,
            'CostingCategoryId', w0,
            'Name', w1,
            'Description', w1,
            'Quantity', w2,
            'DimensionUnitId', w0,
            'DimensionUnit', w1,
            'UnitPrice', w2,
            'CurrencyId', w0,
            'Total', w2,
            'IsTimeUnit', w0,
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