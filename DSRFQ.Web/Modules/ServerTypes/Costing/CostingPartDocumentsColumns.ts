import { ColumnsBase, fieldsProxy } from '@serenity-is/corelib';
import { Column } from '@serenity-is/sleekgrid';
import { CostingPartDocumentsRow } from './CostingPartDocumentsRow';

export interface CostingPartDocumentsColumns {
    Id: Column<CostingPartDocumentsRow>;
    CostingPartId: Column<CostingPartDocumentsRow>;
    FileDirectory: Column<CostingPartDocumentsRow>;
    FileName: Column<CostingPartDocumentsRow>;
    Type: Column<CostingPartDocumentsRow>;
    InsertDate: Column<CostingPartDocumentsRow>;
    InsertUserId: Column<CostingPartDocumentsRow>;
    UpdateDate: Column<CostingPartDocumentsRow>;
    UpdateUserId: Column<CostingPartDocumentsRow>;
    DeleteDate: Column<CostingPartDocumentsRow>;
    DeleteUserId: Column<CostingPartDocumentsRow>;
    IsActive: Column<CostingPartDocumentsRow>;
}

export class CostingPartDocumentsColumns extends ColumnsBase<CostingPartDocumentsRow> {
    static readonly columnsKey = 'Costing.CostingPartDocuments';
    static readonly Fields = fieldsProxy<CostingPartDocumentsColumns>();
}