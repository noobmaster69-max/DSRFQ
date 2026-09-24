import { SaveRequest, SaveResponse, ServiceOptions, DeleteRequest, DeleteResponse, RetrieveRequest, RetrieveResponse, ListRequest, ListResponse, serviceRequest } from '@serenity-is/corelib';
import { ToolTemplateConversionRow } from './ToolTemplateConversionRow';

export namespace ToolTemplateConversionService {
    export const baseUrl = 'Master/ToolTemplateConversion';

    export declare function Create(request: SaveRequest<ToolTemplateConversionRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Update(request: SaveRequest<ToolTemplateConversionRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Delete(request: DeleteRequest, onSuccess?: (response: DeleteResponse) => void, opt?: ServiceOptions<any>): PromiseLike<DeleteResponse>;
    export declare function Retrieve(request: RetrieveRequest, onSuccess?: (response: RetrieveResponse<ToolTemplateConversionRow>) => void, opt?: ServiceOptions<any>): PromiseLike<RetrieveResponse<ToolTemplateConversionRow>>;
    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<ToolTemplateConversionRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<ToolTemplateConversionRow>>;

    export const Methods = {
        Create: "Master/ToolTemplateConversion/Create",
        Update: "Master/ToolTemplateConversion/Update",
        Delete: "Master/ToolTemplateConversion/Delete",
        Retrieve: "Master/ToolTemplateConversion/Retrieve",
        List: "Master/ToolTemplateConversion/List"
    } as const;

    [
        'Create',
        'Update',
        'Delete',
        'Retrieve',
        'List'
    ].forEach(x => {
        (<any>ToolTemplateConversionService)[x] = function (r, s, o) {
            return serviceRequest(baseUrl + '/' + x, r, s, o);
        };
    });
}
