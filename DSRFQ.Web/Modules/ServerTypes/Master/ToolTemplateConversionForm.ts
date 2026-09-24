import { PrefixedContext, StringEditor, BooleanEditor, DecimalEditor, ImageUploadEditor, initFormType } from '@serenity-is/corelib';

export interface ToolTemplateConversionForm {
    Name: StringEditor;
    LogoPicture: ImageUploadEditor;
    TablePicture: ImageUploadEditor;
    Default: BooleanEditor;
    RevisionX1: DecimalEditor;
    RevisionY1: DecimalEditor;
    RevisionX2: DecimalEditor;
    RevisionY2: DecimalEditor;
    PartNumberX1: DecimalEditor;
    PartNumberY1: DecimalEditor;
    PartNumberX2: DecimalEditor;
    PartNumberY2: DecimalEditor;
    DescriptionX1: DecimalEditor;
    DescriptionY1: DecimalEditor;
    DescriptionX2: DecimalEditor;
    DescriptionY2: DecimalEditor;
    MaterialX1: DecimalEditor;
    MaterialY1: DecimalEditor;
    MaterialX2: DecimalEditor;
    MaterialY2: DecimalEditor;
    WeightX1: DecimalEditor;
    WeightY1: DecimalEditor;
    WeightX2: DecimalEditor;
    WeightY2: DecimalEditor;
    AngularToleranceX1: DecimalEditor;
    AngularToleranceY1: DecimalEditor;
    AngularToleranceX2: DecimalEditor;
    AngularToleranceY2: DecimalEditor;
    SurfaceX1: DecimalEditor;
    SurfaceY1: DecimalEditor;
    SurfaceX2: DecimalEditor;
    SurfaceY2: DecimalEditor;
    Tolerance1X1: DecimalEditor;
    Tolerance1Y1: DecimalEditor;
    Tolerance1X2: DecimalEditor;
    Tolerance1Y2: DecimalEditor;
    Tolerance2X1: DecimalEditor;
    Tolerance2Y1: DecimalEditor;
    Tolerance2X2: DecimalEditor;
    Tolerance2Y2: DecimalEditor;
    Tolerance3X1: DecimalEditor;
    Tolerance3Y1: DecimalEditor;
    Tolerance3X2: DecimalEditor;
    Tolerance3Y2: DecimalEditor;
    Tolerance4X1: DecimalEditor;
    Tolerance4Y1: DecimalEditor;
    Tolerance4X2: DecimalEditor;
    Tolerance4Y2: DecimalEditor;
}

export class ToolTemplateConversionForm extends PrefixedContext {
    static readonly formKey = 'Master.ToolTemplateConversion';
    private static init: boolean;

    constructor(prefix: string) {
        super(prefix);
        if (!ToolTemplateConversionForm.init)  {
            ToolTemplateConversionForm.init = true;

            var w0 = StringEditor;
            var w1 = ImageUploadEditor;
            var w2 = BooleanEditor;
            var w3 = DecimalEditor;

            initFormType(ToolTemplateConversionForm, [
            'Name', w0,
            'LogoPicture', w1,
            'TablePicture', w1,
            'Default', w2,
            'RevisionX1', w3,
            'RevisionY1', w3,
            'RevisionX2', w3,
            'RevisionY2', w3,
            'PartNumberX1', w3,
            'PartNumberY1', w3,
            'PartNumberX2', w3,
            'PartNumberY2', w3,
            'DescriptionX1', w3,
            'DescriptionY1', w3,
            'DescriptionX2', w3,
            'DescriptionY2', w3,
            'MaterialX1', w3,
            'MaterialY1', w3,
            'MaterialX2', w3,
            'MaterialY2', w3,
            'WeightX1', w3,
            'WeightY1', w3,
            'WeightX2', w3,
            'WeightY2', w3,
            'AngularToleranceX1', w3,
            'AngularToleranceY1', w3,
            'AngularToleranceX2', w3,
            'AngularToleranceY2', w3,
            'SurfaceX1', w3,
            'SurfaceY1', w3,
            'SurfaceX2', w3,
            'SurfaceY2', w3,
            'Tolerance1X1', w3,
            'Tolerance1Y1', w3,
            'Tolerance1X2', w3,
            'Tolerance1Y2', w3,
            'Tolerance2X1', w3,
            'Tolerance2Y1', w3,
            'Tolerance2X2', w3,
            'Tolerance2Y2', w3,
            'Tolerance3X1', w3,
            'Tolerance3Y1', w3,
            'Tolerance3X2', w3,
            'Tolerance3Y2', w3,
            'Tolerance4X1', w3,
            'Tolerance4Y1', w3,
            'Tolerance4X2', w3,
            'Tolerance4Y2', w3,
            ]);
        }
    }
}
