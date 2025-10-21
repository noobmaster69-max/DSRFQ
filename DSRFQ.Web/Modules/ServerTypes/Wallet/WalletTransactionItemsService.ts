import { SaveRequest, SaveResponse, ServiceOptions, DeleteRequest, DeleteResponse, RetrieveRequest, RetrieveResponse, ListRequest, ListResponse, serviceRequest } from "@serenity-is/corelib";
import { WalletTransactionItemsRow } from "./WalletTransactionItemsRow";

export namespace WalletTransactionItemsService {
    export const baseUrl = 'Wallet/WalletTransactionItems';

    export declare function Create(request: SaveRequest<WalletTransactionItemsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Update(request: SaveRequest<WalletTransactionItemsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Delete(request: DeleteRequest, onSuccess?: (response: DeleteResponse) => void, opt?: ServiceOptions<any>): PromiseLike<DeleteResponse>;
    export declare function Retrieve(request: RetrieveRequest, onSuccess?: (response: RetrieveResponse<WalletTransactionItemsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<RetrieveResponse<WalletTransactionItemsRow>>;
    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<WalletTransactionItemsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<WalletTransactionItemsRow>>;

    export const Methods = {
        Create: "Wallet/WalletTransactionItems/Create",
        Update: "Wallet/WalletTransactionItems/Update",
        Delete: "Wallet/WalletTransactionItems/Delete",
        Retrieve: "Wallet/WalletTransactionItems/Retrieve",
        List: "Wallet/WalletTransactionItems/List"
    } as const;

    [
        'Create', 
        'Update', 
        'Delete', 
        'Retrieve', 
        'List'
    ].forEach(x => {
        (<any>WalletTransactionItemsService)[x] = function (r, s, o) {
            return serviceRequest(baseUrl + '/' + x, r, s, o);
        };
    });
}