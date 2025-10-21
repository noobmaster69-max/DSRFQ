import { ServiceOptions, ServiceResponse, serviceRequest } from "@serenity-is/corelib";
import { TranslationListRequest, TranslationListResponse, TranslationUpdateRequest, TranslateTextRequest, TranslateTextResponse } from "@serenity-is/extensions";

export namespace TranslationService {
    export const baseUrl = 'Administration/Translation';

    export declare function List(request: TranslationListRequest, onSuccess?: (response: TranslationListResponse) => void, opt?: ServiceOptions<any>): PromiseLike<TranslationListResponse>;
    export declare function Update(request: TranslationUpdateRequest, onSuccess?: (response: ServiceResponse) => void, opt?: ServiceOptions<any>): PromiseLike<ServiceResponse>;
    export declare function TranslateText(request: TranslateTextRequest, onSuccess?: (response: TranslateTextResponse) => void, opt?: ServiceOptions<any>): PromiseLike<TranslateTextResponse>;

    export const Methods = {
        List: "Administration/Translation/List",
        Update: "Administration/Translation/Update",
        TranslateText: "Administration/Translation/TranslateText"
    } as const;

    [
        'List', 
        'Update', 
        'TranslateText'
    ].forEach(x => {
        (<any>TranslationService)[x] = function (r, s, o) {
            return serviceRequest(baseUrl + '/' + x, r, s, o);
        };
    });
}