import { Decorators, EntityDialog } from '@serenity-is/corelib';
import { VolumeUnitsForm, VolumeUnitsRow, VolumeUnitsService } from '../../ServerTypes/Master';

@Decorators.registerClass('DSRFQ.Master.VolumeUnitsDialog')
export class VolumeUnitsDialog extends EntityDialog<VolumeUnitsRow, any> {
    protected getFormKey() { return VolumeUnitsForm.formKey; }
    protected getRowDefinition() { return VolumeUnitsRow; }
    protected getService() { return VolumeUnitsService.baseUrl; }

    protected form = new VolumeUnitsForm(this.idPrefix);
}