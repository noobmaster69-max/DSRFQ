import { Decorators, EntityDialog, EntityGrid, gridPageInit } from "@serenity-is/corelib";
import { LanguageColumns, LanguageForm, LanguageRow, LanguageService } from "../../ServerTypes/Administration";

export default () => gridPageInit(LanguageGrid);

class LanguageGrid<P = {}> extends EntityGrid<LanguageRow, P> {
    protected getColumnsKey() { return LanguageColumns.columnsKey; }
    protected getDialogType() { return LanguageDialog; }
    protected getRowDefinition() { return LanguageRow; }
    protected getService() { return LanguageService.baseUrl; }
}

@Decorators.registerClass('DSRFQ.Administration.LanguageDialog')
export class LanguageDialog<P = {}> extends EntityDialog<LanguageRow, P> {
    protected getFormKey() { return LanguageForm.formKey; }
    protected getRowDefinition() { return LanguageRow; }
    protected getService() { return LanguageService.baseUrl; }
}