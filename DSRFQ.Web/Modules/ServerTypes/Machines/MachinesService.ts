import { SaveRequest, SaveResponse, ServiceOptions, DeleteRequest, DeleteResponse, RetrieveRequest, RetrieveResponse, ListRequest, ListResponse, serviceRequest } from '@serenity-is/corelib';
import { MachinesRow } from './MachinesRow';

export namespace MachinesService {
    export const baseUrl = 'Machines/Machines';

    export declare function Create(request: SaveRequest<MachinesRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Update(request: SaveRequest<MachinesRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Delete(request: DeleteRequest, onSuccess?: (response: DeleteResponse) => void, opt?: ServiceOptions<any>): PromiseLike<DeleteResponse>;
    export declare function Retrieve(request: RetrieveRequest, onSuccess?: (response: RetrieveResponse<MachinesRow>) => void, opt?: ServiceOptions<any>): PromiseLike<RetrieveResponse<MachinesRow>>;
    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<MachinesRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<MachinesRow>>;

    export const Methods = {
        Create: "Machines/Machines/Create",
        Update: "Machines/Machines/Update",
        Delete: "Machines/Machines/Delete",
        Retrieve: "Machines/Machines/Retrieve",
        List: "Machines/Machines/List"
    } as const;

    [
        'Create', 
        'Update', 
        'Delete', 
        'Retrieve', 
        'List'
    ].forEach(x => {
        (<any>MachinesService)[x] = function (r, s, o) { 
            return serviceRequest(baseUrl + '/' + x, r, s, o); 
        };
    });
}