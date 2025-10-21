import { PrefixedContext, IntegerEditor, StringEditor, DecimalEditor, DateEditor, initFormType } from '@serenity-is/corelib';

export interface MachinesForm {
    Name: StringEditor;
    Description: StringEditor;
    Precision: DecimalEditor;
    AxisNumber: IntegerEditor;
    Cost: DecimalEditor;
    WorkEnvelopeX: DecimalEditor;
    WorkEnvelopeY: DecimalEditor;
    WorkEnvelopeZ: DecimalEditor;
    WeightLimit: DecimalEditor;
    CurrencyId: IntegerEditor;
    InsertDate: DateEditor;
    InsertUserId: IntegerEditor;
    UpdateDate: DateEditor;
    UpdateUserId: IntegerEditor;
    DeleteDate: DateEditor;
    DeleteUserId: IntegerEditor;
    IsActive: IntegerEditor;
    CompanyId: IntegerEditor;
}

export class MachinesForm extends PrefixedContext {
    static readonly formKey = 'Machines.Machines';
    private static init: boolean;
    
    constructor(prefix: string) {
        super(prefix);
        if (!MachinesForm.init)  {
            MachinesForm.init = true;
            
            var w0 = IntegerEditor;
            var w1 = StringEditor;
            var w2 = DecimalEditor;
            var w3 = DateEditor;

            initFormType(MachinesForm, [
            'Name', w1,
            'Description', w1,
            'Precision', w2,
            'AxisNumber', w0,
            'Cost', w2,
            'WorkEnvelopeX', w2,
            'WorkEnvelopeY', w2,
            'WorkEnvelopeZ', w2,
            'WeightLimit', w2,
            'CurrencyId', w0,
            'InsertDate', w3,
            'InsertUserId', w0,
            'UpdateDate', w3,
            'UpdateUserId', w0,
            'DeleteDate', w3,
            'DeleteUserId', w0,
            'IsActive', w0,
            'CompanyId', w0,
            ]);
        }
    }
}