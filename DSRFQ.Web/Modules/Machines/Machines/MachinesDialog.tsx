import { Decorators, EntityDialog } from '@serenity-is/corelib';
import { MachinesForm, MachinesRow, MachinesService } from '../../ServerTypes/Machines';

@Decorators.registerClass('DSRFQ.Machines.MachinesDialog')
export class MachinesDialog extends EntityDialog<MachinesRow, any> {
    protected getFormKey() { return MachinesForm.formKey; }
    protected getRowDefinition() { return MachinesRow; }
    protected getService() { return MachinesService.baseUrl; }

    protected form = new MachinesForm(this.idPrefix);
}