// HAND-WRITTEN STAND-IN for a sergen-generated file.
//
// sergen 8.8.6 targets net8.0 and this machine has only .NET 6 and .NET 10, so
// `dotnet sergen servertypings` cannot run (and crashes under roll-forward).
// Once a .NET 8 runtime is installed, regenerate and this file is overwritten
// with the real output - the shape below deliberately matches it exactly.
import { fieldsProxy } from '@serenity-is/corelib';

export interface CostingPartBalloonsRow {
    Id?: number;
    CostingPartId?: number;
    BalloonNo?: string;
    PageNumber?: number;
    CenterX?: number;
    CenterY?: number;
    BalloonColor?: string;
    BalloonSize?: number;
    BBoxX1?: number;
    BBoxY1?: number;
    BBoxX2?: number;
    BBoxY2?: number;
    Symbol?: string;
    OriginalSymbol?: string;
    FeatureSymbolId?: number;
    FeatureSymbolName?: string;
    FeatureSymbolSymbol?: string;
    UpperTol?: string;
    LowerTol?: string;
    InspectionToolId?: number;
    InspectionToolName?: string;
    ToleranceStandard?: string;
    Multiplier?: string;
    Section?: string;
    GridStart?: string;
    GridEnd?: string;
    IsNote?: boolean;
    IsDatum?: boolean;
    Manual?: boolean;
    RemovedByUser?: boolean;
    Audited?: boolean;
    AuditedOn?: string;
    AuditedBy?: string;
    BalloonShape?: string;
    BalloonLineWidth?: number;
    BalloonStyle?: string;
    TextColor?: string;
    ShowArrow?: boolean;
    BalloonScale?: number;
    BoxHidden?: boolean;
    DimensionFeature?: string;
    NumberCategory?: string;
    ExportMode?: string;
    CropRotation?: number;
    InsertDate?: string;
    InsertUserId?: number;
    UpdateDate?: string;
    UpdateUserId?: number;
    DeleteDate?: string;
    DeleteUserId?: number;
    IsActive?: number;
    CostingPartPartNumber?: string;
}

export abstract class CostingPartBalloonsRow {
    static readonly idProperty = 'Id';
    static readonly nameProperty = 'BalloonNo';
    static readonly localTextPrefix = 'Costing.CostingPartBalloons';

    static readonly deletePermission = '?';
    static readonly insertPermission = '?';
    static readonly readPermission = '?';
    static readonly updatePermission = '?';

    static readonly Fields = fieldsProxy<CostingPartBalloonsRow>();
}
