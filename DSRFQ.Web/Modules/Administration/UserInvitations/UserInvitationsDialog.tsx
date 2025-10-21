import { Decorators, EntityDialog } from '@serenity-is/corelib';
import { UserInvitationsForm, UserInvitationsRow, UserInvitationsService } from '../../ServerTypes/Administration';

@Decorators.registerClass('DSRFQ.Administration.UserInvitationsDialog')
export class UserInvitationsDialog extends EntityDialog<UserInvitationsRow, any> {
    protected getFormKey() { return UserInvitationsForm.formKey; }
    protected getRowDefinition() { return UserInvitationsRow; }
    protected getService() { return UserInvitationsService.baseUrl; }

    protected form = new UserInvitationsForm(this.idPrefix);
}