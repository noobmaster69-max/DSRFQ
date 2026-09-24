// HAND-WRITTEN STAND-IN for a sergen-generated file.
//
// sergen 8.8.6 targets net8.0 and this machine has only .NET 6 and .NET 10, so
// `dotnet sergen servertypings` cannot run (and crashes under roll-forward).
// Once a .NET 8 runtime is installed, regenerate and this file is overwritten
// with the real output - the shape below deliberately matches it exactly.
import { SaveRequest, SaveResponse, ServiceOptions, DeleteRequest, DeleteResponse, RetrieveRequest, RetrieveResponse, ListRequest, ListResponse, serviceRequest } from '@serenity-is/corelib';
import { CostingPartBalloonGridsRow } from './CostingPartBalloonGridsRow';

export namespace CostingPartBalloonGridsService {
    export const baseUrl = 'Costing/CostingPartBalloonGrids';

    export declare function Create(request: SaveRequest<CostingPartBalloonGridsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Update(request: SaveRequest<CostingPartBalloonGridsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Delete(request: DeleteRequest, onSuccess?: (response: DeleteResponse) => void, opt?: ServiceOptions<any>): PromiseLike<DeleteResponse>;
    export declare function Retrieve(request: RetrieveRequest, onSuccess?: (response: RetrieveResponse<CostingPartBalloonGridsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<RetrieveResponse<CostingPartBalloonGridsRow>>;
    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<CostingPartBalloonGridsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<CostingPartBalloonGridsRow>>;

    export const Methods = {
        Create: "Costing/CostingPartBalloonGrids/Create",
        Update: "Costing/CostingPartBalloonGrids/Update",
        Delete: "Costing/CostingPartBalloonGrids/Delete",
        Retrieve: "Costing/CostingPartBalloonGrids/Retrieve",
        List: "Costing/CostingPartBalloonGrids/List"
    } as const;

    [
        'Create',
        'Update',
        'Delete',
        'Retrieve',
        'List'
    ].forEach(x => {
        (<any>CostingPartBalloonGridsService)[x] = function (r, s, o) {
            return serviceRequest(baseUrl + '/' + x, r, s, o);
        };
    });
}
