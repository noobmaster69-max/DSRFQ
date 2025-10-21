import { PrefixedContext, IntegerEditor, DecimalEditor, DateEditor, initFormType } from '@serenity-is/corelib';

export interface SurfaceTreatmentProcessCostsForm {
    SurfaceTreatmentProcessId: IntegerEditor;
    DimensionUnitId: IntegerEditor;
    PricePerUnitArea: DecimalEditor;
    Default: IntegerEditor;
    InsertDate: DateEditor;
    InsertUserId: IntegerEditor;
    UpdateDate: DateEditor;
    UpdateUserId: IntegerEditor;
    DeleteDate: DateEditor;
    DeleteUserId: IntegerEditor;
    IsActive: IntegerEditor;
}

export class SurfaceTreatmentProcessCostsForm extends PrefixedContext {
    static readonly formKey = 'Master.SurfaceTreatmentProcessCosts';
    private static init: boolean;
    
    constructor(prefix: string) {
        super(prefix);
        if (!SurfaceTreatmentProcessCostsForm.init)  {
            SurfaceTreatmentProcessCostsForm.init = true;
            
            var w0 = IntegerEditor;
            var w1 = DecimalEditor;
            var w2 = DateEditor;

            initFormType(SurfaceTreatmentProcessCostsForm, [
            'SurfaceTreatmentProcessId', w0,
            'DimensionUnitId', w0,
            'PricePerUnitArea', w1,
            'Default', w0,
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