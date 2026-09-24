import {Authorization, notifyError} from '@serenity-is/corelib';
import {SettingsRow} from '@/ServerTypes/Master/SettingsRow';
import {SettingsService} from '@/ServerTypes/Master/SettingsService';

/**
 * Where the shop's ballooning conventions live.
 *
 * These four settings used to be read straight out of localStorage by the
 * modules that own them. That made them per-browser, which is wrong twice over:
 * every one of them describes the shop rather than the machine - so two
 * operators could number a child balloon "5-1" and "5.1" on the same drawing -
 * and the RFQ consumer, which is the other half of the same feature, could not
 * see them at all.
 *
 * So MasterSettings is now the source of truth and localStorage is a cache. The
 * cache is not decoration: it keeps the sync load/save API the four modules
 * already have, which is what lets this be a small change to each of them
 * rather than a rewrite of every call site, and it keeps the widget usable if
 * the settings row cannot be read.
 *
 * Read once per widget, not per call: these are house conventions that change a
 * few times a year, and the tolerance settings alone are consulted for every
 * balloon on the sheet.
 */

export type SettingKey = 'tolerance' | 'keywords' | 'filters' | 'separator'
    | 'bubbleStyle' | 'partitionOrder' | 'symbolFilter' | 'pdfExport' | 'editorDefaults';

/** Which column each setting is stored in. */
const COLUMN: Record<SettingKey, keyof SettingsRow> = {
    tolerance: 'DefaultToleranceJson',
    keywords: 'AlwaysFilterKeywords',
    filters: 'DimensionFiltersJson',
    separator: 'SubNumberSeparator',
    bubbleStyle: 'BubbleStyleJson',
    partitionOrder: 'PartitionOrderJson',
    symbolFilter: 'SymbolFilterJson',
    pdfExport: 'PdfExportJson',
    editorDefaults: 'EditorDefaultsJson',
};

/**
 * The localStorage keys these settings used before the table existed. Still
 * written, as the cache, and still read - both as the fallback when the row
 * cannot be fetched and as the source for the one-time seed in hydrate().
 */
const LOCAL_KEY: Record<SettingKey, string> = {
    tolerance: 'dsrfq.ballooning.defaultTolerance',
    keywords: 'dsrfq.ballooning.alwaysFilterKeywords',
    filters: 'dsrfq.ballooning.dimensionFilters',
    separator: 'dsrfq.ballooning.subSeparator',
    bubbleStyle: 'dsrfq.ballooning.bubbleStyle',
    partitionOrder: 'dsrfq.ballooning.partitionOrder',
    symbolFilter: 'dsrfq.ballooning.symbolFilter',
    pdfExport: 'dsrfq.ballooning.pdfExport',
    editorDefaults: 'dsrfq.ballooning.editorDefaults',
};

const KEYS = Object.keys(COLUMN) as SettingKey[];

/**
 * The datum switches, which the RFQ consumer reads rather than the browser.
 *
 * Typed rather than a JSON blob because the consumer reads them in SQL, and
 * kept apart from SettingKey for the same reason: those four are opaque strings
 * this store never looks inside, these three have meaning here.
 */
export interface DatumSettings {
    /** Create balloons for datums no recognised text covered. */
    addMissing: boolean;
    /** Floor for added balloons only, on top of the detector's own 0.5. */
    addMinConfidence: number;
}

/** What ships, and what is shown before the row has been read. */
export const DEFAULT_DATUM_SETTINGS: DatumSettings = {
    addMissing: true, addMinConfidence: 0,
};

let rowId: number | null = null;
let cache: Partial<Record<SettingKey, string | null>> = {};
let datum: DatumSettings = {...DEFAULT_DATUM_SETTINGS};
let hydrated = false;

function localGet(key: SettingKey): string | null {
    try {
        return localStorage.getItem(LOCAL_KEY[key]);
    } catch {
        return null;    // private browsing
    }
}

function localSet(key: SettingKey, value: string): void {
    try {
        localStorage.setItem(LOCAL_KEY[key], value);
    } catch {
        // Full or disabled. The in-memory cache still has it for this session,
        // and the server write below is the one that actually matters.
    }
}

/**
 * Load the settings row into the cache. Call once, before the widget reads any
 * setting; every read after this is synchronous.
 *
 * Never throws. A settings row that cannot be read leaves every module on its
 * localStorage value, or its own defaults - which is exactly how they behaved
 * before this table existed, so a failure here degrades rather than breaks.
 */
export async function hydrateSettings(): Promise<void> {
    try {
        let row: SettingsRow | undefined;
        await SettingsService.List({}, res => { row = (res.Entities ?? [])[0]; });
        if (!row) return;

        rowId = row.Id ?? null;

        datum = {
            addMissing: row.DatumAddMissing ?? DEFAULT_DATUM_SETTINGS.addMissing,
            addMinConfidence: Number(row.DatumAddMinConfidence ?? 0) || 0,
        };

        // Columns the shop has never set. The operator's existing localStorage
        // value is promoted to the shop setting rather than discarded, so
        // moving these to the database does not silently reset everyone.
        //
        // Whoever opens a drawing first wins where two operators disagree.
        // That is not ideal, but the alternative is throwing away settings
        // people have already tuned, and an admin can correct it afterwards.
        const seed: Partial<Record<SettingKey, string>> = {};

        for (const key of KEYS) {
            const stored = row[COLUMN[key]] as string | null | undefined;
            if (stored !== null && stored !== undefined && stored !== '') {
                cache[key] = stored;
                localSet(key, stored);
                continue;
            }
            const local = localGet(key);
            cache[key] = local;
            if (local !== null) seed[key] = local;
        }

        hydrated = true;
        if (rowId != null && Object.keys(seed).length)
            await push(seed);
    } catch {
        // Offline, or no permission to read. Leave hydrated false: the getters
        // fall through to localStorage on their own.
    }
}

/** Write the given columns to the settings row. */
async function push(values: Partial<Record<SettingKey, string>>): Promise<void> {
    if (rowId == null) return;
    const entity: SettingsRow = {Id: rowId};
    for (const key of Object.keys(values) as SettingKey[])
        (entity as any)[COLUMN[key]] = values[key];
    await SettingsService.Update({EntityId: rowId, Entity: entity});
}

/**
 * The stored value, or null where nothing has ever been saved.
 *
 * Null matters: the keyword list distinguishes "never set" - which means hand
 * back the defaults - from "saved empty", which means the operator cleared it
 * and meant it.
 */
export function getSetting(key: SettingKey): string | null {
    if (hydrated && key in cache) return cache[key] ?? null;
    return localGet(key);
}

/**
 * Save a setting for the whole shop.
 *
 * The cache and localStorage are updated first so the UI reflects the change
 * immediately, then the row is written. A failed write is reported rather than
 * swallowed: without it the operator would believe they had changed the shop's
 * convention when they had only changed their own browser's copy.
 */
export function setSetting(key: SettingKey, value: string): void {
    cache[key] = value;
    localSet(key, value);

    if (rowId == null) return;      // never hydrated; local-only, as before
    push({[key]: value}).then(undefined, (e: any) => {
        notifyError('This setting was applied here but could not be saved for '
            + 'the shop: ' + (e?.message ?? e ?? 'the server did not answer')
            + '. Other machines will still use the old value.');
    });
}

/**
 * The datum switches as last read. Never null - before the row is read these
 * are the shipped defaults, which is what the consumer falls back to as well.
 */
export function getDatumSettings(): DatumSettings {
    return {...datum};
}

/**
 * Save the datum switches. Unlike setSetting this is awaited by its caller:
 * these are admin-only, changed deliberately from a dialog, and the operator
 * should be told whether it took before the dialog closes.
 */
export async function saveDatumSettings(next: DatumSettings): Promise<void> {
    if (rowId == null)
        throw new Error('The settings row has not been read; reload the page.');
    await SettingsService.Update({
        EntityId: rowId,
        Entity: {
            Id: rowId,
            DatumAddMissing: next.addMissing,
            DatumAddMinConfidence: next.addMinConfidence,
        },
    });
    datum = {...next};
}

/**
 * May this user change settings for the whole shop?
 *
 * Matches SettingsRow's ModifyPermission. Checked so the menu can show an
 * operator what the shop is set to without letting them change it - the
 * alternative is a control that looks editable and fails on save.
 */
export function canEditShopSettings(): boolean {
    try {
        return Authorization.hasPermission('Administration:General');
    } catch {
        return false;
    }
}

/** Test seam: forget everything read so far. */
export function resetSettingsCache(): void {
    rowId = null;
    cache = {};
    datum = {...DEFAULT_DATUM_SETTINGS};
    hydrated = false;
}
