/**
 * The settings store, in memory, for the node unit tests.
 *
 * The real one reaches for MasterSettings over a Serenity service and falls
 * back to localStorage - neither of which exists under bare node. The modules
 * under test (BallooningNumbering, BallooningDimensionFilter, ...) are pure
 * logic apart from this one dependency, so stubbing it is what keeps them
 * testable without a browser or a database.
 *
 * It is a real store rather than a pair of no-ops so a test can still check
 * that a value written is the value read back.
 */

export type SettingKey = 'tolerance' | 'keywords' | 'filters' | 'separator'
    | 'bubbleStyle' | 'partitionOrder' | 'symbolFilter' | 'pdfExport' | 'editorDefaults';

// On globalThis so a test that bundles its own copy of this stub can still
// reach the same values - e.g. to plant a corrupt one.
const values: Map<SettingKey, string> =
    (globalThis as any).__ballooningSettings ??= new Map<SettingKey, string>();

export function getSetting(key: SettingKey): string | null {
    return values.has(key) ? values.get(key)! : null;
}

export function setSetting(key: SettingKey, value: string): void {
    values.set(key, value);
}

export async function hydrateSettings(): Promise<void> { /* nothing to fetch */ }

export function resetSettingsCache(): void {
    values.clear();
}
