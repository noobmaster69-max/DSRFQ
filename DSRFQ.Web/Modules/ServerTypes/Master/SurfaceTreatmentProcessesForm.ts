import { PrefixedContext, IntegerEditor, StringEditor, DateEditor, initFormType } from '@serenity-is/corelib';

export interface SurfaceTreatmentProcessesForm {
    Name: StringEditor;
    Description: StringEditor;
    InsertDate: DateEditor;
    InsertUserId: IntegerEditor;
    UpdateDate: DateEditor;
    UpdateUserId: IntegerEditor;
    DeleteDate: DateEditor;
    DeleteUserId: IntegerEditor;
    IsActive: IntegerEditor;
    SpecificationNumber: StringEditor;
    Comments: StringEditor;
    Restriction: StringEditor;
    SupplierName: StringEditor;
    Country: StringEditor;
    State: StringEditor;
    City: StringEditor;
    DateApprove: DateEditor;
    DateExpire: DateEditor;
    Capable: IntegerEditor;
}

export class SurfaceTreatmentProcessesForm extends PrefixedContext {
    static readonly formKey = 'Master.SurfaceTreatmentProcesses';
    private static init: boolean;
    CostItems: any;
    
    constructor(prefix: string) {
        super(prefix);
        if (!SurfaceTreatmentProcessesForm.init)  {
            SurfaceTreatmentProcessesForm.init = true;
            
            var w0 = IntegerEditor;
            var w1 = StringEditor;
            var w2 = DateEditor;

            initFormType(SurfaceTreatmentProcessesForm, [
            'Name', w1,
            'Description', w1,
            'InsertDate', w2,
            'InsertUserId', w0,
            'UpdateDate', w2,
            'UpdateUserId', w0,
            'DeleteDate', w2,
            'DeleteUserId', w0,
            'IsActive', w0,
            'SpecificationNumber', w1,
            'Comments', w1,
            'Restriction', w1,
            'SupplierName', w1,
            'Country', w1,
            'State', w1,
            'City', w1,
            'DateApprove', w2,
            'DateExpire', w2,
            'Capable', w0,
            ]);
        }
    }
}