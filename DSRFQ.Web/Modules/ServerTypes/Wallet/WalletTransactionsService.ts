import { SaveRequest, SaveResponse, ServiceOptions, DeleteRequest, DeleteResponse, RetrieveRequest, RetrieveResponse, ListRequest, ListResponse, serviceRequest } from "@serenity-is/corelib";
import { WalletTransactionsRow } from "./WalletTransactionsRow";

export namespace WalletTransactionsService {
    export const baseUrl = 'Wallet/WalletTransactions';

    export declare function Create(request: SaveRequest<WalletTransactionsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Update(request: SaveRequest<WalletTransactionsRow>, onSuccess?: (response: SaveResponse) => void, opt?: ServiceOptions<any>): PromiseLike<SaveResponse>;
    export declare function Delete(request: DeleteRequest, onSuccess?: (response: DeleteResponse) => void, opt?: ServiceOptions<any>): PromiseLike<DeleteResponse>;
    export declare function Retrieve(request: RetrieveRequest, onSuccess?: (response: RetrieveResponse<WalletTransactionsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<RetrieveResponse<WalletTransactionsRow>>;
    export declare function List(request: ListRequest, onSuccess?: (response: ListResponse<WalletTransactionsRow>) => void, opt?: ServiceOptions<any>): PromiseLike<ListResponse<WalletTransactionsRow>>;

    export const Methods = {
        Create: "Wallet/WalletTransactions/Create",
        Update: "Wallet/WalletTransactions/Update",
        Delete: "Wallet/WalletTransactions/Delete",
        Retrieve: "Wallet/WalletTransactions/Retrieve",
        List: "Wallet/WalletTransactions/List"
    } as const;

    [
        'Create', 
        'Update', 
        'Delete', 
        'Retrieve', 
        'List'
    ].forEach(x => {
        (<any>WalletTransactionsService)[x] = function (r, s, o) {
            return serviceRequest(baseUrl + '/' + x, r, s, o);
        };
    });
}