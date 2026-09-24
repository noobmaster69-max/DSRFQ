import { SaveRequest, SaveResponse, ServiceOptions, DeleteRequest, DeleteResponse, RetrieveRequest, RetrieveResponse, ListRequest, ListResponse, ServiceRequest, ServiceResponse, serviceRequest } from '@serenity-is/corelib';
import { CostingPartsRow } from './CostingPartsRow';

/** Mirrors DSRFQ.Costing.RerunStage. */
export enum RerunStage {
    Drawing = 1,
    Costing = 2,
    Ballooning = 3
}

export interface RerunStageRequest extends ServiceRequest {
    /** 1-based page to restrict the run to. Ballooning only; null = all pages. */
    PageNumber?: number;
    CostingPartId?: number;
    Stage?: RerunStage;
    Force?: boolean;
    /** Ballooning, whole document: only pages with no balloons yet. */
    SkipDonePages?: boolean;
}

export interface RerunStageResponse extends ServiceResponse {
    Queue?: string;
    Message?: string;
}

export interface ApplyMaterialRequest extends ServiceRequest {
    CostingPartId?: number;
    MaterialId?: number;
}

export interface ApplyMaterialResponse extends ServiceResponse {
    GrossWeight?: number;
    NetWeight?: number;
    UnitPrice?: number;
    Total?: number;
    PartTotal?: number;
    Message?: string;
}

export namespace CostingPartsService {
    export const baseUrl = 'Costing/CostingParts';

    export declare function Create(request: SaveRequest<CostingPartsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Update(request: SaveRequest<CostingPartsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Delete(request: DeleteRequest, onSuccess?: (response: DeleteResponse) => void, opt?: ServiceOptions<any>): PromiseLike<DeleteResponse>;
    export declare function Retrieve(request: RetrieveRequest, onSuccess?: (response: RetrieveResponse<CostingPartsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<RetrieveResponse<CostingPartsRow>>;
    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<CostingPartsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<CostingPartsRow>>;
    export declare function Rerun(request: RerunStageRequest, onSuccess?: (response: RerunStageResponse) => void, opt?: ServiceOptions<any>): PromiseLike<RerunStageResponse>;
    export declare function ApplyMaterial(request: ApplyMaterialRequest, onSuccess?: (response: ApplyMaterialResponse) => void, opt?: ServiceOptions<any>): PromiseLike<ApplyMaterialResponse>;

    export const Methods = {
        Create: "Costing/CostingParts/Create",
        Update: "Costing/CostingParts/Update",
        Delete: "Costing/CostingParts/Delete",
        Retrieve: "Costing/CostingParts/Retrieve",
        List: "Costing/CostingParts/List",
        Rerun: "Costing/CostingParts/Rerun",
        ApplyMaterial: "Costing/CostingParts/ApplyMaterial"
    } as const;

    [
        'Create',
        'Update',
        'Delete',
        'Retrieve',
        'List',
        'Rerun',
        'ApplyMaterial'
    ].forEach(x => {
        (<any>CostingPartsService)[x] = function (r, s, o) { 
            return serviceRequest(baseUrl + '/' + x, r, s, o); 
        };
    });
}