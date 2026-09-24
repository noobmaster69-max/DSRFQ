import { Decorators, EntityGrid, htmlEncode } from '@serenity-is/corelib';
import { Column } from '@serenity-is/sleekgrid';
import { ToolTemplateConversionColumns, ToolTemplateConversionRow, ToolTemplateConversionService } from '../../ServerTypes/Master';
import { ToolTemplateConversionDialog } from './ToolTemplateConversionDialog';

const PICTURE_COLUMNS = ['LogoPicture', 'TablePicture'];

@Decorators.registerClass('DSRFQ.Master.ToolTemplateConversionGrid')
export class ToolTemplateConversionGrid extends EntityGrid<ToolTemplateConversionRow> {
    protected getColumnsKey() { return ToolTemplateConversionColumns.columnsKey; }
    protected getDialogType() { return ToolTemplateConversionDialog; }
    protected getRowDefinition() { return ToolTemplateConversionRow; }
    protected getService() { return ToolTemplateConversionService.baseUrl; }

    protected getColumns(): Column[] {
        const columns = super.getColumns();

        // Templates are told apart by their artwork far quicker than by name,
        // so the two upload columns render the image rather than its path.
        for (const column of columns) {
            if (!PICTURE_COLUMNS.includes(column.field))
                continue;

            column.format = ctx => {
                const file = ctx.value as string;
                if (!file)
                    return '';
                const src = '/upload/' + htmlEncode(file);
                return `<img src="${src}" alt="" loading="lazy" ` +
                    `style="height:100%;width:auto;object-fit:contain" />`;
            };
        }

        return columns;
    }
}
