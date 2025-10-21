import { ColumnsBase, fieldsProxy } from '@serenity-is/corelib';
import { Column } from '@serenity-is/sleekgrid';
import { SurfaceTreatmentProcessCostsRow } from './SurfaceTreatmentProcessCostsRow';

export interface SurfaceTreatmentProcessCostsColumns {
    Id: Column<SurfaceTreatmentProcessCostsRow>;
    SurfaceTreatmentProcessId: Column<SurfaceTreatmentProcessCostsRow>;
    DimensionUnitId: Column<SurfaceTreatmentProcessCostsRow>;
    PricePerUnitArea: Column<SurfaceTreatmentProcessCostsRow>;
    Default: Column<SurfaceTreatmentProcessCostsRow>;
    InsertDate: Column<SurfaceTreatmentProcessCostsRow>;
    InsertUserId: Column<SurfaceTreatmentProcessCostsRow>;
    UpdateDate: Column<SurfaceTreatmentProcessCostsRow>;
    UpdateUserId: Column<SurfaceTreatmentProcessCostsRow>;
    DeleteDate: Column<SurfaceTreatmentProcessCostsRow>;
    DeleteUserId: Column<SurfaceTreatmentProcessCostsRow>;
    IsActive: Column<SurfaceTreatmentProcessCostsRow>;
}

export class SurfaceTreatmentProcessCostsColumns extends ColumnsBase<SurfaceTreatmentProcessCostsRow> {
    static readonly columnsKey = 'Master.SurfaceTreatmentProcessCosts';
    static readonly Fields = fieldsProxy<SurfaceTreatmentProcessCostsColumns>();
}