// HAND-WRITTEN STAND-IN for a sergen-generated file.
//
// sergen 8.8.6 targets net8.0 and this machine has only .NET 6 and .NET 10, so
// `dotnet sergen servertypings` cannot run (and crashes under roll-forward).
// Once a .NET 8 runtime is installed, regenerate and this file is overwritten
// with the real output - the shape below deliberately matches it exactly.
import { fieldsProxy } from '@serenity-is/corelib';

export interface CostingPartFilesRow {
    Id?: number;
    CostingPartId?: number;
    /** CostingPartDocuments.Type: 1 = 2D, 2 = 3D, 3 = CAD. */
    DocumentType?: number;
    FileName?: string;
    FileDirectory?: string;
    ConvertedFileDirectory?: string;
    UploadedAt?: string;
    PartNumber?: string;
    Revision?: string;
    Description?: string;
    Material?: string;
    MaterialId?: number;
    CustomerName?: string;
    Uom?: string;
    PartPicture?: string;
    CostingMachineName?: string;
    Length?: number;
    Width?: number;
    Height?: number;
    GrossWeight?: number;
    NetWeight?: number;
    NumberOfFace?: number;
    NumberOfHole?: number;
    DrawingConversionStatusId?: number;
    OcrStatusId?: number;
    CostingStatusId?: number;
    BalloonStatusId?: number;
    BomLineCount?: number;
    SpecialProcessCount?: number;
    BalloonCount?: number;
    CostingTotal?: number;
    /** Other active documents sharing this file name. */
    DuplicateCount?: number;
    /** Quick-search index, including BOM and special-process text. Not displayed. */
    SearchText?: string;
}

export abstract class CostingPartFilesRow {
    static readonly idProperty = 'Id';
    static readonly nameProperty = 'FileName';
    static readonly localTextPrefix = 'Costing.CostingPartFiles';

    static readonly readPermission = '?';

    static readonly Fields = fieldsProxy<CostingPartFilesRow>();
}
