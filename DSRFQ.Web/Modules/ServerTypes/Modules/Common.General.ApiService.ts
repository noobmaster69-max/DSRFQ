import { ServiceOptions, ServiceRequest, serviceRequest } from "@serenity-is/corelib";
import { UserRow } from "../Administration/UserRow";
import { BillingHistoryModel } from "../Common/BillingHistoryModel";
import { OrganizationModel } from "./Common.General.OrganizationModel";

export namespace ApiService {
    export const baseUrl = 'Common/General';

    export declare function FetchCompanyUser(request: OrganizationModel, onSuccess?: (response: UserRow[]) => void, opt?: ServiceOptions<any>): PromiseLike<UserRow[]>;
    export declare function FetchBalance(request: ServiceRequest, onSuccess?: (response: number[]) => void, opt?: ServiceOptions<any>): PromiseLike<number[]>;
    export declare function FetchBillingHistory(request: ServiceRequest, onSuccess?: (response: BillingHistoryModel[]) => void, opt?: ServiceOptions<any>): PromiseLike<BillingHistoryModel[]>;

    export const Methods = {
        FetchCompanyUser: "Common/General/FetchCompanyUser",
        FetchBalance: "Common/General/FetchBalance",
        FetchBillingHistory: "Common/General/FetchBillingHistory"
    } as const;

    [
        'FetchCompanyUser', 
        'FetchBalance', 
        'FetchBillingHistory'
    ].forEach(x => {
        (<any>ApiService)[x] = function (r, s, o) {
            return serviceRequest(baseUrl + '/' + x, r, s, o);
        };
    });
}