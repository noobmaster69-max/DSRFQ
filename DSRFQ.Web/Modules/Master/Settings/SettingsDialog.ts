import { Decorators, EntityDialog, ToolButton } from '@serenity-is/corelib';
import { SettingsForm, SettingsRow, SettingsService } from '../../ServerTypes/Master';

/**
 * The one settings row.
 *
 * Delete and Clone are removed for the same reason the grid has no Add: there
 * is one row by construction, and the widget and the RFQ consumer both assume
 * it is there.
 */
@Decorators.registerClass('DSRFQ.Master.SettingsDialog')
export class SettingsDialog extends EntityDialog<SettingsRow, any> {
    protected getFormKey() { return SettingsForm.formKey; }
    protected getRowDefinition() { return SettingsRow; }
    protected getService() { return SettingsService.baseUrl; }

    protected form = new SettingsForm(this.idPrefix);

    protected getToolbarButtons(): ToolButton[] {
        return (super.getToolbarButtons() ?? []).filter(
            b => b?.cssClass !== 'delete-button' && b?.cssClass !== 'clone-button');
    }
}
