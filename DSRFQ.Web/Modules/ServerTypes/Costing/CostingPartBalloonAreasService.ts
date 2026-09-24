// HAND-WRITTEN STAND-IN for a sergen-generated file.
//
// sergen 8.8.6 targets net8.0 and this machine has only .NET 6 and .NET 10, so
// `dotnet sergen servertypings` cannot run (and crashes under roll-forward).
// Once a .NET 8 runtime is installed, regenerate and this file is overwritten
// with the real output - the shape below deliberately matches it exactly.
import { SaveRequest, SaveResponse, ServiceOptions, DeleteRequest, DeleteResponse, RetrieveRequest, RetrieveResponse, ListRequest, ListResponse, serviceRequest } from '@serenity-is/corelib';
import { CostingPartBalloonAreasRow } from './CostingPartBalloonAreasRow';

export namespace CostingPartBalloonAreasService {
    export const baseUrl = 'Costing/CostingPartBalloonAreas';

    export declare function Create(request: SaveRequest<CostingPartBalloonAreasRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Update(request: SaveRequest<CostingPartBalloonAreasRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Delete(request: DeleteRequest, onSuccess?: (response: DeleteResponse) => void, opt?: ServiceOptions<any>): PromiseLike<DeleteResponse>;
    export declare function Retrieve(request: RetrieveRequest, onSuccess?: (response: RetrieveResponse<CostingPartBalloonAreasRow>) => void, opt?: ServiceOptions<any>): PromiseLike<RetrieveResponse<CostingPartBalloonAreasRow>>;
    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<CostingPartBalloonAreasRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<CostingPartBalloonAreasRow>>;

    export const Methods = {
        Create: "Costing/CostingPartBalloonAreas/Create",
        Update: "Costing/CostingPartBalloonAreas/Update",
        Delete: "Costing/CostingPartBalloonAreas/Delete",
        Retrieve: "Costing/CostingPartBalloonAreas/Retrieve",
        List: "Costing/CostingPartBalloonAreas/List"
    } as const;

    [
        'Create',
        'Update',
        'Delete',
        'Retrieve',
        'List'
    ].forEach(x => {
        (<any>CostingPartBalloonAreasService)[x] = function (r, s, o) {
            return serviceRequest(baseUrl + '/' + x, r, s, o);
        };
    });
}
