import { ColumnsBase, fieldsProxy } from '@serenity-is/corelib';
import { Column } from '@serenity-is/sleekgrid';
import { ToolTemplateConversionRow } from './ToolTemplateConversionRow';

export interface ToolTemplateConversionColumns {
    Id: Column<ToolTemplateConversionRow>;
    Name: Column<ToolTemplateConversionRow>;
    LogoPicture: Column<ToolTemplateConversionRow>;
    TablePicture: Column<ToolTemplateConversionRow>;
    Default: Column<ToolTemplateConversionRow>;
    InsertDate: Column<ToolTemplateConversionRow>;
    UpdateDate: Column<ToolTemplateConversionRow>;
}

export class ToolTemplateConversionColumns extends ColumnsBase<ToolTemplateConversionRow> {
    static readonly columnsKey = 'Master.ToolTemplateConversion';
    static readonly Fields = fieldsProxy<ToolTemplateConversionColumns>();
}
