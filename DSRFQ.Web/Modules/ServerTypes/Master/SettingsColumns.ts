import { fieldsProxy } from "@serenity-is/corelib";
import { SettingsRow } from "./SettingsRow";

export interface SettingsColumns {
    Id: SettingsRow;
    DatumAddMissing: SettingsRow;
    DatumAddMinConfidence: SettingsRow;
    SubNumberSeparator: SettingsRow;
    UpdateDate: SettingsRow;
}

export class SettingsColumns {
    static readonly columnsKey = 'Master.Settings';
    static readonly Fields = fieldsProxy<SettingsColumns>();
}
