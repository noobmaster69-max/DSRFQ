import { ColumnsBase, fieldsProxy } from "@serenity-is/corelib";
import { Column } from "@serenity-is/sleekgrid";
import { GroupsRow } from "./GroupsRow";

export interface GroupsColumns {
    Id: Column<GroupsRow>;
    Name: Column<GroupsRow>;
    Description: Column<GroupsRow>;
    InsertDate: Column<GroupsRow>;
    InsertBy: Column<GroupsRow>;
    UpdateDate: Column<GroupsRow>;
    UpdateBy: Column<GroupsRow>;
    DeleteDate: Column<GroupsRow>;
    DeleteBy: Column<GroupsRow>;
}

export class GroupsColumns extends ColumnsBase<GroupsRow> {
    static readonly columnsKey = 'Company.Groups';
    static readonly Fields = fieldsProxy<GroupsColumns>();
}