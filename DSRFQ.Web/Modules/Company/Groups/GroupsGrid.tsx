import { Decorators, EntityGrid } from '@serenity-is/corelib';
import { GroupsColumns, GroupsRow, GroupsService } from '../../ServerTypes/Company';
import { GroupsDialog } from './GroupsDialog';

@Decorators.registerClass('DSRFQ.Company.GroupsGrid')
export class GroupsGrid extends EntityGrid<GroupsRow> {
    protected getColumnsKey() { return GroupsColumns.columnsKey; }
    protected getDialogType() { return GroupsDialog; }
    protected getRowDefinition() { return GroupsRow; }
    protected getService() { return GroupsService.baseUrl; }
}