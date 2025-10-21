import { ColumnsBase, fieldsProxy } from '@serenity-is/corelib';
import { Column } from '@serenity-is/sleekgrid';
import { RawMaterialCostsRow } from './RawMaterialCostsRow';

export interface RawMaterialCostsColumns {
    Id: Column<RawMaterialCostsRow>;
    MaterialId: Column<RawMaterialCostsRow>;
    MaterialTemperId: Column<RawMaterialCostsRow>;
    MaterialShapeId: Column<RawMaterialCostsRow>;
    WeightDimensionUnitId: Column<RawMaterialCostsRow>;
    CurrencyId: Column<RawMaterialCostsRow>;
    UnitPrice: Column<RawMaterialCostsRow>;
    FromDate: Column<RawMaterialCostsRow>;
    ToDate: Column<RawMaterialCostsRow>;
    CompanyId: Column<RawMaterialCostsRow>;
    GroupId: Column<RawMaterialCostsRow>;
    InsertDate: Column<RawMaterialCostsRow>;
    InsertUserId: Column<RawMaterialCostsRow>;
    UpdateDate: Column<RawMaterialCostsRow>;
    UpdateUserId: Column<RawMaterialCostsRow>;
    DeleteDate: Column<RawMaterialCostsRow>;
    DeleteUserId: Column<RawMaterialCostsRow>;
    IsActive: Column<RawMaterialCostsRow>;
}

export class RawMaterialCostsColumns extends ColumnsBase<RawMaterialCostsRow> {
    static readonly columnsKey = 'Material.RawMaterialCosts';
    static readonly Fields = fieldsProxy<RawMaterialCostsColumns>();
}