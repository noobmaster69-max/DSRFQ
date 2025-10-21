import { Decorators, EntityGrid } from '@serenity-is/corelib';
import { CompanyGroupsColumns, CompanyGroupsRow, CompanyGroupsService } from '../../ServerTypes/Company';
import { CompanyGroupsDialog } from './CompanyGroupsDialog';

@Decorators.registerClass('DSRFQ.Company.CompanyGroupsGrid')
export class CompanyGroupsGrid extends EntityGrid<CompanyGroupsRow> {
    protected getColumnsKey() { return CompanyGroupsColumns.columnsKey; }
    protected getDialogType() { return CompanyGroupsDialog; }
    protected getRowDefinition() { return CompanyGroupsRow; }
    protected getService() { return CompanyGroupsService.baseUrl; }
}