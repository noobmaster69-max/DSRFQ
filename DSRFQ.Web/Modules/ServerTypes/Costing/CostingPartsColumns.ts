import { ColumnsBase, fieldsProxy } from '@serenity-is/corelib';
import { Column } from '@serenity-is/sleekgrid';
import { CostingPartsRow } from './CostingPartsRow';

export interface CostingPartsColumns {
    Id: Column<CostingPartsRow>;
    PartNumber: Column<CostingPartsRow>;
    Revision: Column<CostingPartsRow>;
    Description: Column<CostingPartsRow>;
    Length: Column<CostingPartsRow>;
    Width: Column<CostingPartsRow>;
    Height: Column<CostingPartsRow>;
    DimensionUnitId: Column<CostingPartsRow>;
    PartPicture: Column<CostingPartsRow>;
    MaterialId: Column<CostingPartsRow>;
    MaterialTemperId: Column<CostingPartsRow>;
    GrossVolume: Column<CostingPartsRow>;
    NetVolume: Column<CostingPartsRow>;
    VolumeUnitId: Column<CostingPartsRow>;
    GrossWeight: Column<CostingPartsRow>;
    NetWeight: Column<CostingPartsRow>;
    WeightUnitId: Column<CostingPartsRow>;
    NumberOfFace: Column<CostingPartsRow>;
    NumberOfHole: Column<CostingPartsRow>;
    InsertDate: Column<CostingPartsRow>;
    InsertUserId: Column<CostingPartsRow>;
    UpdateDate: Column<CostingPartsRow>;
    UpdateUserId: Column<CostingPartsRow>;
    DeleteDate: Column<CostingPartsRow>;
    DeleteUserId: Column<CostingPartsRow>;
    IsActive: Column<CostingPartsRow>;
}

export class CostingPartsColumns extends ColumnsBase<CostingPartsRow> {
    static readonly columnsKey = 'Costing.CostingParts';
    static readonly Fields = fieldsProxy<CostingPartsColumns>();
}