import { PrefixedContext, IntegerEditor, StringEditor, DecimalEditor, DateEditor, initFormType } from '@serenity-is/corelib';

export interface CostingPartsForm {
    PartNumber: StringEditor;
    Revision: StringEditor;
    Description: StringEditor;
    Length: DecimalEditor;
    Width: DecimalEditor;
    Height: DecimalEditor;
    DimensionUnitId: IntegerEditor;
    PartPicture: StringEditor;
    MaterialId: IntegerEditor;
    MaterialTemperId: IntegerEditor;
    GrossVolume: DecimalEditor;
    NetVolume: DecimalEditor;
    VolumeUnitId: IntegerEditor;
    GrossWeight: DecimalEditor;
    NetWeight: DecimalEditor;
    WeightUnitId: IntegerEditor;
    NumberOfFace: IntegerEditor;
    NumberOfHole: IntegerEditor;
    InsertDate: DateEditor;
    InsertUserId: IntegerEditor;
    UpdateDate: DateEditor;
    UpdateUserId: IntegerEditor;
    DeleteDate: DateEditor;
    DeleteUserId: IntegerEditor;
    IsActive: IntegerEditor;
}

export class CostingPartsForm extends PrefixedContext {
    static readonly formKey = 'Costing.CostingParts';
    private static init: boolean;
    
    constructor(prefix: string) {
        super(prefix);
        if (!CostingPartsForm.init)  {
            CostingPartsForm.init = true;
            
            var w0 = IntegerEditor;
            var w1 = StringEditor;
            var w2 = DecimalEditor;
            var w3 = DateEditor;

            initFormType(CostingPartsForm, [
            'PartNumber', w1,
            'Revision', w1,
            'Description', w1,
            'Length', w2,
            'Width', w2,
            'Height', w2,
            'DimensionUnitId', w0,
            'PartPicture', w1,
            'MaterialId', w0,
            'MaterialTemperId', w0,
            'GrossVolume', w2,
            'NetVolume', w2,
            'VolumeUnitId', w0,
            'GrossWeight', w2,
            'NetWeight', w2,
            'WeightUnitId', w0,
            'NumberOfFace', w0,
            'NumberOfHole', w0,
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