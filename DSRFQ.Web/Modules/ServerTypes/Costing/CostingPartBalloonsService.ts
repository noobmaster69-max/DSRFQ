// HAND-WRITTEN STAND-IN for a sergen-generated file.
//
// sergen 8.8.6 targets net8.0 and this machine has only .NET 6 and .NET 10, so
// `dotnet sergen servertypings` cannot run (and crashes under roll-forward).
// Once a .NET 8 runtime is installed, regenerate and this file is overwritten
// with the real output - the shape below deliberately matches it exactly.
import { SaveRequest, SaveResponse, ServiceOptions, DeleteRequest, DeleteResponse, RetrieveRequest, RetrieveResponse, ListRequest, ListResponse, ServiceRequest, ServiceResponse, serviceRequest } from '@serenity-is/corelib';
import { CostingPartBalloonsRow } from './CostingPartBalloonsRow';

export interface RecognizeRegionRequest extends ServiceRequest {
    CostingPartId?: number;
    /** The page image path under /upload, as the widget loads it. */
    PageImage?: string;
    Mode?: 'area' | 'single';
    /** Percent of page. */
    X?: number;
    Y?: number;
    Width?: number;
    Height?: number;
}

export interface RecognizedBalloon {
    Symbol?: string;
    OriginalSymbol?: string;
    Quantity?: number;
    UpperTol?: string;
    LowerTol?: string;
    IsNote?: boolean;
    BBoxX1?: number;
    BBoxY1?: number;
    BBoxX2?: number;
    BBoxY2?: number;
    Confidence?: number;
}

export interface RecognizeRegionResponse extends ServiceResponse {
    Mode?: string;
    Items?: RecognizedBalloon[];
}

export interface ViewLinksRequest extends ServiceRequest {
    CostingPartId?: number;
}

/** A section / detail view and where it was cut from. Positions are percent of page. */
export interface ViewLink {
    Id?: number;
    Kind?: 'section' | 'detail' | 'view';
    Letter?: string;
    Title?: string;
    PageNumber?: number;
    LabelX1?: number; LabelY1?: number; LabelX2?: number; LabelY2?: number;
    ViewX1?: number; ViewY1?: number; ViewX2?: number; ViewY2?: number;
    MarkPageNumber?: number;
    /** [{x1, y1, x2, y2}], up to two. */
    MarksJson?: string;
    LineX1?: number; LineY1?: number; LineX2?: number; LineY2?: number;
}

export interface ViewLinksResponse extends ServiceResponse {
    Links?: ViewLink[];
}

export namespace CostingPartBalloonsService {
    export const baseUrl = 'Costing/CostingPartBalloons';

    export declare function Create(request: SaveRequest<CostingPartBalloonsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Update(request: SaveRequest<CostingPartBalloonsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Delete(request: DeleteRequest, onSuccess?: (response: DeleteResponse) => void, opt?: ServiceOptions<any>): PromiseLike<DeleteResponse>;
    export declare function Retrieve(request: RetrieveRequest, onSuccess?: (response: RetrieveResponse<CostingPartBalloonsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<RetrieveResponse<CostingPartBalloonsRow>>;
    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<CostingPartBalloonsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<CostingPartBalloonsRow>>;
    export declare function RecognizeRegion(request: RecognizeRegionRequest, onSuccess?: (response: RecognizeRegionResponse) => void, opt?: ServiceOptions<any>): PromiseLike<RecognizeRegionResponse>;
    export declare function ListViewLinks(request: ViewLinksRequest, onSuccess?: (response: ViewLinksResponse) => void, opt?: ServiceOptions<any>): PromiseLike<ViewLinksResponse>;

    export const Methods = {
        Create: "Costing/CostingPartBalloons/Create",
        Update: "Costing/CostingPartBalloons/Update",
        Delete: "Costing/CostingPartBalloons/Delete",
        Retrieve: "Costing/CostingPartBalloons/Retrieve",
        List: "Costing/CostingPartBalloons/List",
        RecognizeRegion: "Costing/CostingPartBalloons/RecognizeRegion",
        ListViewLinks: "Costing/CostingPartBalloons/ListViewLinks"
    } as const;

    [
        'Create',
        'Update',
        'Delete',
        'Retrieve',
        'List',
        'RecognizeRegion',
        'ListViewLinks'
    ].forEach(x => {
        (<any>CostingPartBalloonsService)[x] = function (r, s, o) {
            return serviceRequest(baseUrl + '/' + x, r, s, o);
        };
    });
}
