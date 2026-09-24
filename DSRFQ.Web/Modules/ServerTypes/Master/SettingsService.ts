import { SaveRequest, SaveResponse, ServiceOptions, RetrieveRequest, RetrieveResponse, ListRequest, ListResponse, serviceRequest } from '@serenity-is/corelib';
import { SettingsRow } from './SettingsRow';

// No Create and no Delete: the table holds one seeded row by construction.
export namespace SettingsService {
    export const baseUrl = 'Master/Settings';

    export declare function Update(request: SaveRequest<SettingsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Retrieve(request: RetrieveRequest, onSuccess?: (response: RetrieveResponse<SettingsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<RetrieveResponse<SettingsRow>>;
    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<SettingsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<SettingsRow>>;

    export const Methods = {
        Update: "Master/Settings/Update",
        Retrieve: "Master/Settings/Retrieve",
        List: "Master/Settings/List"
    } as const;

    [
        'Update',
        'Retrieve',
        'List'
    ].forEach(x => {
        (<any>SettingsService)[x] = function (r, s, o) {
            return serviceRequest(baseUrl + '/' + x, r, s, o);
        };
    });
}
