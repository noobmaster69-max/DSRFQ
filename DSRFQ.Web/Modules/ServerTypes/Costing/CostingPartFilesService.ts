// HAND-WRITTEN STAND-IN for a sergen-generated file.
//
// sergen 8.8.6 targets net8.0 and this machine has only .NET 6 and .NET 10, so
// `dotnet sergen servertypings` cannot run (and crashes under roll-forward).
// Once a .NET 8 runtime is installed, regenerate and this file is overwritten
// with the real output - the shape below deliberately matches it exactly.
import { ColumnsBase, fieldsProxy, ServiceOptions, ServiceRequest, ServiceResponse, ListRequest, ListResponse, serviceRequest } from '@serenity-is/corelib';
import { Column } from '@serenity-is/sleekgrid';
import { CostingPartFilesRow } from './CostingPartFilesRow';

export interface FileDetailRequest extends ServiceRequest {
    CostingPartId?: number;
    DocumentId?: number;
}

export interface FileBomLine {
    PartNumber?: string;
    Description?: string;
    Quantity?: number;
    InternalEngineeringNumber?: string;
}

export interface FileCostLine {
    Name?: string;
    Quantity?: number;
    UnitPrice?: number;
    Total?: number;
    MachineName?: string;
}

export interface DuplicateFile {
    CostingPartID?: number;
    FileName?: string;
    InsertDate?: string;
}

export interface FileDetailResponse extends ServiceResponse {
    Bom?: FileBomLine[];
    SpecialProcesses?: string[];
    Costing?: FileCostLine[];
    Duplicates?: DuplicateFile[];
}

export interface CostingPartFilesColumns {
    PartPicture: Column<CostingPartFilesRow>;
    FileName: Column<CostingPartFilesRow>;
    DocumentType: Column<CostingPartFilesRow>;
    CostingPartId: Column<CostingPartFilesRow>;
    PartNumber: Column<CostingPartFilesRow>;
    Revision: Column<CostingPartFilesRow>;
    Description: Column<CostingPartFilesRow>;
    Material: Column<CostingPartFilesRow>;
    CustomerName: Column<CostingPartFilesRow>;
    Length: Column<CostingPartFilesRow>;
    GrossWeight: Column<CostingPartFilesRow>;
    BomLineCount: Column<CostingPartFilesRow>;
    SpecialProcessCount: Column<CostingPartFilesRow>;
    BalloonCount: Column<CostingPartFilesRow>;
    CostingMachineName: Column<CostingPartFilesRow>;
    DuplicateCount: Column<CostingPartFilesRow>;
    UploadedAt: Column<CostingPartFilesRow>;
}

export class CostingPartFilesColumns extends ColumnsBase<CostingPartFilesRow> {
    static readonly columnsKey = 'Costing.CostingPartFiles';
    static readonly Fields = fieldsProxy<CostingPartFilesColumns>();
}

export namespace CostingPartFilesService {
    export const baseUrl = 'Costing/CostingPartFiles';

    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<CostingPartFilesRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<CostingPartFilesRow>>;
    export declare function Detail(request: FileDetailRequest, onSuccess?: (response: FileDetailResponse) => void, opt?: ServiceOptions<any>): PromiseLike<FileDetailResponse>;

    export const Methods = {
        List: "Costing/CostingPartFiles/List",
        Detail: "Costing/CostingPartFiles/Detail"
    } as const;

    [
        'List',
        'Detail'
    ].forEach(x => {
        (<any>CostingPartFilesService)[x] = function (r, s, o) {
            return serviceRequest(baseUrl + '/' + x, r, s, o);
        };
    });
}
