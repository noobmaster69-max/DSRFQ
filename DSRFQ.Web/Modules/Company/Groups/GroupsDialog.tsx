import { Decorators, EntityDialog } from '@serenity-is/corelib';
import { GroupsForm, GroupsRow, GroupsService } from '../../ServerTypes/Company';

@Decorators.registerClass('DSRFQ.Company.GroupsDialog')
export class GroupsDialog extends EntityDialog<GroupsRow, any> {
    protected getFormKey() { return GroupsForm.formKey; }
    protected getRowDefinition() { return GroupsRow; }
    protected getService() { return GroupsService.baseUrl; }

    protected form = new GroupsForm(this.idPrefix);
}