import {
    ServiceLookupEditor,
    StringEditor,
    DecimalEditor,
    PrefixedContext,
    initFormType,
    MultipleFileUploadEditor, FileUploadEditor
} from "@serenity-is/corelib";

export interface DrawingImportForm {
    TwoDFileName: FileUploadEditor;
    ThreeDFileName:FileUploadEditor
}

export class DrawingImportForm extends PrefixedContext {
    static readonly formKey = 'Drawing.DrawingImport';
    private static init: boolean;

    constructor(prefix: string) {
        super(prefix);

        if (!DrawingImportForm.init)  {
            DrawingImportForm.init = true;

            var w0 = FileUploadEditor;
            var w1 = FileUploadEditor

            initFormType(DrawingImportForm, [
                'TwoDFileName', w0, 'ThreeDFileName',w1
                
            ]);
        }
    }
}