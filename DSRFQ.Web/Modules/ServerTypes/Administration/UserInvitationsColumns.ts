import { ColumnsBase, fieldsProxy } from "@serenity-is/corelib";
import { Column } from "@serenity-is/sleekgrid";
import { UserInvitationsRow } from "./UserInvitationsRow";

export interface UserInvitationsColumns {
    Id: Column<UserInvitationsRow>;
    InvitedByUserName: Column<UserInvitationsRow>;
    EmailAddress: Column<UserInvitationsRow>;
    Accepted: Column<UserInvitationsRow>;
    InsertDate: Column<UserInvitationsRow>;
    InsertBy: Column<UserInvitationsRow>;
    UpdateDate: Column<UserInvitationsRow>;
    UpdateBy: Column<UserInvitationsRow>;
    DeleteDate: Column<UserInvitationsRow>;
    DeleteBy: Column<UserInvitationsRow>;
}

export class UserInvitationsColumns extends ColumnsBase<UserInvitationsRow> {
    static readonly columnsKey = 'Administration.UserInvitations';
    static readonly Fields = fieldsProxy<UserInvitationsColumns>();
}