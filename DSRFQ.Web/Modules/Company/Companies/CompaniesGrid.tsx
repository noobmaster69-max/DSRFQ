import { Decorators, EntityGrid } from '@serenity-is/corelib';
import { CompaniesColumns, CompaniesRow, CompaniesService } from '../../ServerTypes/Company';
import { CompaniesDialog } from './CompaniesDialog';

@Decorators.registerClass('DSRFQ.Company.CompaniesGrid')
export class CompaniesGrid extends EntityGrid<CompaniesRow> {
    protected getColumnsKey() { return CompaniesColumns.columnsKey; }
    protected getDialogType() { return CompaniesDialog; }
    protected getRowDefinition() { return CompaniesRow; }
    protected getService() { return CompaniesService.baseUrl; }
}