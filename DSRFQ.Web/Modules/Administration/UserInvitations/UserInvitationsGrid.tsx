import { Decorators, EntityGrid } from '@serenity-is/corelib';
import { UserInvitationsColumns, UserInvitationsRow, UserInvitationsService } from '../../ServerTypes/Administration';
import { UserInvitationsDialog } from './UserInvitationsDialog';

@Decorators.registerClass('DSRFQ.Administration.UserInvitationsGrid')
export class UserInvitationsGrid extends EntityGrid<UserInvitationsRow> {
    protected getColumnsKey() { return UserInvitationsColumns.columnsKey; }
    protected getDialogType() { return UserInvitationsDialog; }
    protected getRowDefinition() { return UserInvitationsRow; }
    protected getService() { return UserInvitationsService.baseUrl; }
}