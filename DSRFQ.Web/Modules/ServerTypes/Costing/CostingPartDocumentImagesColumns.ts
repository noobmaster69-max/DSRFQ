import { ColumnsBase, fieldsProxy } from '@serenity-is/corelib';
import { Column } from '@serenity-is/sleekgrid';
import { CostingPartDocumentImagesRow } from './CostingPartDocumentImagesRow';

export interface CostingPartDocumentImagesColumns {
    Id: Column<CostingPartDocumentImagesRow>;
    CostingPartDocumentId: Column<CostingPartDocumentImagesRow>;
    FileDirectory: Column<CostingPartDocumentImagesRow>;
    FileName: Column<CostingPartDocumentImagesRow>;
    Page: Column<CostingPartDocumentImagesRow>;
    InsertDate: Column<CostingPartDocumentImagesRow>;
    InsertUserId: Column<CostingPartDocumentImagesRow>;
    UpdateDate: Column<CostingPartDocumentImagesRow>;
    UpdateUserId: Column<CostingPartDocumentImagesRow>;
    DeleteDate: Column<CostingPartDocumentImagesRow>;
    DeleteUserId: Column<CostingPartDocumentImagesRow>;
    IsActive: Column<CostingPartDocumentImagesRow>;
}

export class CostingPartDocumentImagesColumns extends ColumnsBase<CostingPartDocumentImagesRow> {
    static readonly columnsKey = 'Costing.CostingPartDocumentImages';
    static readonly Fields = fieldsProxy<CostingPartDocumentImagesColumns>();
}