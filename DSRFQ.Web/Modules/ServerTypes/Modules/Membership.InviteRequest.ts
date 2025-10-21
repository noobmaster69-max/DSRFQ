import { ServiceRequest } from "@serenity-is/corelib";

export interface InviteRequest extends ServiceRequest {
    InvitedByUserId?: number;
    DisplayName?: string;
    Email?: string;
}