import { alertDialog, Decorators, toId } from "@serenity-is/corelib";
import { GridEditorBase } from "@serenity-is/extensions";
import { SurfaceTreatmentProcessCostsRow } from "../../ServerTypes/Master/SurfaceTreatmentProcessCostsRow";
import { SurfaceTreatmentProcessCostsColumns } from "../../ServerTypes/Master/SurfaceTreatmentProcessCostsColumns";
import { SurfaceTreatmentProcessCostsDialog } from "./SurfaceTreatmentProcessCostsDialog";
import { SurfaceTreatmentProcessCostsService } from "../../ServerTypes/Master/SurfaceTreatmentProcessCostsService";
import { DimensionUnitsRow } from "../../ServerTypes/Master/DimensionUnitsRow";

@Decorators.registerEditor("DSRFQ.Master.SurfaceTreatmentProcessCostsEditor")
export class SurfaceTreatmentProcessCostsEditor<P = {}>
    extends GridEditorBase<SurfaceTreatmentProcessCostsRow, P> {

    protected getColumnsKey() { return SurfaceTreatmentProcessCostsColumns.columnsKey; }
    protected getDialogType() { return SurfaceTreatmentProcessCostsDialog; }
    protected getRowDefinition() { return SurfaceTreatmentProcessCostsRow; }
    protected getService() { return SurfaceTreatmentProcessCostsService.baseUrl; }

    protected override async validateEntity(row: SurfaceTreatmentProcessCostsRow, id: any) {
        row.DimensionUnitId = toId(row.DimensionUnitId);

        const lookup = await DimensionUnitsRow.getLookupAsync();
        row.DimensionUnitCode = lookup.itemById[row.DimensionUnitId].Code;

        return true;
    }

    protected override getGridCanLoad() {
        return super.getGridCanLoad() && this.spId != null;
    }

    protected override getNewEntity() {
        return {
            SurfaceTreatmentProcessId: this.spId
        };
    }

    private _spId: number;

    public get spId() {
        return this._spId;
    }

    public set spId(value: number) {
        if (this._spId !== toId(value)) {
            this.setEquality(SurfaceTreatmentProcessCostsRow.Fields.SurfaceTreatmentProcessId, this._spId = toId(value));
            this.connectedMode = this._spId != null;
            this.refresh();
        }
    }
}
