import { Decorators, EntityGrid } from '@serenity-is/corelib';
import { CurrenciesColumns, CurrenciesRow, CurrenciesService } from '../../ServerTypes/Master';
import { CurrenciesDialog } from './CurrenciesDialog';

@Decorators.registerClass('DSRFQ.Master.CurrenciesGrid')
export class CurrenciesGrid extends EntityGrid<CurrenciesRow> {
    protected getColumnsKey() { return CurrenciesColumns.columnsKey; }
    protected getDialogType() { return CurrenciesDialog; }
    protected getRowDefinition() { return CurrenciesRow; }
    protected getService() { return CurrenciesService.baseUrl; }
}