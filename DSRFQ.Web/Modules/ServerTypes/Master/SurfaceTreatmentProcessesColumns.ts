import { ColumnsBase, fieldsProxy } from '@serenity-is/corelib';
import { Column } from '@serenity-is/sleekgrid';
import { SurfaceTreatmentProcessesRow } from './SurfaceTreatmentProcessesRow';

export interface SurfaceTreatmentProcessesColumns {
    Id: Column<SurfaceTreatmentProcessesRow>;
    Name: Column<SurfaceTreatmentProcessesRow>;
    Description: Column<SurfaceTreatmentProcessesRow>;
    InsertDate: Column<SurfaceTreatmentProcessesRow>;
    InsertUserId: Column<SurfaceTreatmentProcessesRow>;
    UpdateDate: Column<SurfaceTreatmentProcessesRow>;
    UpdateUserId: Column<SurfaceTreatmentProcessesRow>;
    DeleteDate: Column<SurfaceTreatmentProcessesRow>;
    DeleteUserId: Column<SurfaceTreatmentProcessesRow>;
    IsActive: Column<SurfaceTreatmentProcessesRow>;
    SpecificationNumber: Column<SurfaceTreatmentProcessesRow>;
    Comments: Column<SurfaceTreatmentProcessesRow>;
    Restriction: Column<SurfaceTreatmentProcessesRow>;
    SupplierName: Column<SurfaceTreatmentProcessesRow>;
    Country: Column<SurfaceTreatmentProcessesRow>;
    State: Column<SurfaceTreatmentProcessesRow>;
    City: Column<SurfaceTreatmentProcessesRow>;
    DateApprove: Column<SurfaceTreatmentProcessesRow>;
    DateExpire: Column<SurfaceTreatmentProcessesRow>;
    Capable: Column<SurfaceTreatmentProcessesRow>;
}

export class SurfaceTreatmentProcessesColumns extends ColumnsBase<SurfaceTreatmentProcessesRow> {
    static readonly columnsKey = 'Master.SurfaceTreatmentProcesses';
    static readonly Fields = fieldsProxy<SurfaceTreatmentProcessesColumns>();
}