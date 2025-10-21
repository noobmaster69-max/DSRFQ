export interface ScriptUserDefinition {
    Username?: string;
    DisplayName?: string;
    IsAdmin?: boolean;
    CompanyId?: number;
    GroupId?: number;
    UserId?: number;
    Permissions?: { [key: string]: boolean };
}