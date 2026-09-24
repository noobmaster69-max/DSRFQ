// HAND-WRITTEN STAND-IN for a sergen-generated file.
//
// sergen 8.8.6 targets net8.0 and this machine has only .NET 6 and .NET 10, so
// `dotnet sergen servertypings` cannot run (and crashes under roll-forward).
// Once a .NET 8 runtime is installed, regenerate and this file is overwritten
// with the real output - the shape below deliberately matches it exactly.
import { ServiceOptions, ServiceRequest, ServiceResponse, ListRequest, ListResponse, serviceRequest } from '@serenity-is/corelib';
import { CostingPartMachineOptionsRow } from './CostingPartMachineOptionsRow';

export interface BuildMachineOptionsRequest extends ServiceRequest {
    CostingPartId?: number;
    /** Rebuild even when options already exist, e.g. after a rate changed. */
    Force?: boolean;
}

export interface BuildMachineOptionsResponse extends ServiceResponse {
    Lines?: number;
    Options?: number;
    Message?: string;
}

export interface ApplyMachineRequest extends ServiceRequest {
    CostingPartCostingResultId?: number;
    MachineId?: number;
}

export interface ApplyMachineResponse extends ServiceResponse {
    UnitPrice?: number;
    Total?: number;
    /** New total for the whole part, so the header can update without a reload. */
    PartTotal?: number;
    Message?: string;
}

export namespace CostingPartMachineOptionsService {
    export const baseUrl = 'Costing/CostingPartMachineOptions';

    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<CostingPartMachineOptionsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<CostingPartMachineOptionsRow>>;
    export declare function Build(request: BuildMachineOptionsRequest, onSuccess?: (response: BuildMachineOptionsResponse) => void, opt?: ServiceOptions<any>): PromiseLike<BuildMachineOptionsResponse>;
    export declare function Apply(request: ApplyMachineRequest, onSuccess?: (response: ApplyMachineResponse) => void, opt?: ServiceOptions<any>): PromiseLike<ApplyMachineResponse>;

    export const Methods = {
        List: "Costing/CostingPartMachineOptions/List",
        Build: "Costing/CostingPartMachineOptions/Build",
        Apply: "Costing/CostingPartMachineOptions/Apply"
    } as const;

    [
        'List',
        'Build',
        'Apply'
    ].forEach(x => {
        (<any>CostingPartMachineOptionsService)[x] = function (r, s, o) {
            return serviceRequest(baseUrl + '/' + x, r, s, o);
        };
    });
}
