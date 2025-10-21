import { ColumnsBase, fieldsProxy } from '@serenity-is/corelib';
import { Column } from '@serenity-is/sleekgrid';
import { CurrenciesRow } from './CurrenciesRow';

export interface CurrenciesColumns {
    Id: Column<CurrenciesRow>;
    Code: Column<CurrenciesRow>;
    Name: Column<CurrenciesRow>;
    InsertDate: Column<CurrenciesRow>;
    InsertUserId: Column<CurrenciesRow>;
    UpdateDate: Column<CurrenciesRow>;
    UpdateUserId: Column<CurrenciesRow>;
    DeleteDate: Column<CurrenciesRow>;
    DeleteUserId: Column<CurrenciesRow>;
    IsActive: Column<CurrenciesRow>;
}

export class CurrenciesColumns extends ColumnsBase<CurrenciesRow> {
    static readonly columnsKey = 'Master.Currencies';
    static readonly Fields = fieldsProxy<CurrenciesColumns>();
}