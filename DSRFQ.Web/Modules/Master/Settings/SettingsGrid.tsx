import { Decorators, EntityGrid, ToolButton } from '@serenity-is/corelib';
import { SettingsColumns, SettingsRow, SettingsService } from '../../ServerTypes/Master';
import { SettingsDialog } from './SettingsDialog';

/**
 * A grid over a table that holds exactly one row.
 *
 * Following DSEFACTORY's SystemSettingsGrid: the Add button is stripped, because
 * a second row would leave the widget and the RFQ consumer free to read
 * different ones. Editing the existing row is the only operation.
 */
@Decorators.registerClass('DSRFQ.Master.SettingsGrid')
export class SettingsGrid extends EntityGrid<SettingsRow> {
    protected getColumnsKey() { return SettingsColumns.columnsKey; }
    protected getDialogType() { return SettingsDialog; }
    protected getRowDefinition() { return SettingsRow; }
    protected getService() { return SettingsService.baseUrl; }

    protected getButtons(): ToolButton[] {
        return (super.getButtons() ?? []).filter(b => b?.cssClass !== 'add-button');
    }
}
