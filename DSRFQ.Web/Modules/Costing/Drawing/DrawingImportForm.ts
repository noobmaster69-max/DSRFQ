import {
    ServiceLookupEditor,
    StringEditor,
    DecimalEditor,
    PrefixedContext,
    initFormType,
    MultipleFileUploadEditor
} from "@serenity-is/corelib";

export interface DrawingImportForm {
    FileName: MultipleFileUploadEditor;
   
}

export class DrawingImportForm extends PrefixedContext {
    static readonly formKey = 'Drawing.DrawingImport';
    private static init: boolean;

    constructor(prefix: string) {
        super(prefix);

        if (!DrawingImportForm.init)  {
            DrawingImportForm.init = true;

            var w0 = MultipleFileUploadEditor;
          

            initFormType(DrawingImportForm, [
                'FileName', w0,
                
            ]);
        }
    }
}