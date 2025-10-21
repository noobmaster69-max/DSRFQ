import { ColumnsBase, fieldsProxy } from '@serenity-is/corelib';
import { Column } from '@serenity-is/sleekgrid';
import { MaterialsRow } from './MaterialsRow';

export interface MaterialsColumns {
    Id: Column<MaterialsRow>;
    Code: Column<MaterialsRow>;
    Name: Column<MaterialsRow>;
    Description: Column<MaterialsRow>;
    Density: Column<MaterialsRow>;
    DimensionUnitId: Column<MaterialsRow>;
    CompanyId: Column<MaterialsRow>;
    InsertDate: Column<MaterialsRow>;
    InsertUserId: Column<MaterialsRow>;
    UpdateDate: Column<MaterialsRow>;
    UpdateUserId: Column<MaterialsRow>;
    DeleteDate: Column<MaterialsRow>;
    DeleteUserId: Column<MaterialsRow>;
    IsActive: Column<MaterialsRow>;
}

export class MaterialsColumns extends ColumnsBase<MaterialsRow> {
    static readonly columnsKey = 'Material.Materials';
    static readonly Fields = fieldsProxy<MaterialsColumns>();
}