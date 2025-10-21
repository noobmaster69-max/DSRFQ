import { ColumnsBase, fieldsProxy } from "@serenity-is/corelib";
import { Column } from "@serenity-is/sleekgrid";
import { CompanyGroupsRow } from "./CompanyGroupsRow";

export interface CompanyGroupsColumns {
    Id: Column<CompanyGroupsRow>;
    CompanyName: Column<CompanyGroupsRow>;
    GroupName: Column<CompanyGroupsRow>;
}

export class CompanyGroupsColumns extends ColumnsBase<CompanyGroupsRow> {
    static readonly columnsKey = 'Company.CompanyGroups';
    static readonly Fields = fieldsProxy<CompanyGroupsColumns>();
}