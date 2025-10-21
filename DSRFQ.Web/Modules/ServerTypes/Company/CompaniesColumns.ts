import { ColumnsBase, fieldsProxy } from "@serenity-is/corelib";
import { Column } from "@serenity-is/sleekgrid";
import { CompaniesRow } from "./CompaniesRow";

export interface CompaniesColumns {
    Id: Column<CompaniesRow>;
    Name: Column<CompaniesRow>;
    Picture: Column<CompaniesRow>;
    OrganizationId: Column<CompaniesRow>;
    InsertDate: Column<CompaniesRow>;
    InsertBy: Column<CompaniesRow>;
    UpdateDate: Column<CompaniesRow>;
    UpdateBy: Column<CompaniesRow>;
    DeleteDate: Column<CompaniesRow>;
    DeleteBy: Column<CompaniesRow>;
}

export class CompaniesColumns extends ColumnsBase<CompaniesRow> {
    static readonly columnsKey = 'Company.Companies';
    static readonly Fields = fieldsProxy<CompaniesColumns>();
}