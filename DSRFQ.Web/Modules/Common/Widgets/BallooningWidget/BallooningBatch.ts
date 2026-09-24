import type {BalloonAnnotation} from './BallooningTypes';

/**
 * Editing many balloons at once.
 *
 * Ported from One Supply (C:\Aizera\RPA\Bubble), `ui/property_editor.py` —
 * `_enter_batch_mode` / `_mark_batch_field_dirty` / `_apply_batch_editor_values`.
 *
 * The whole design rests on one rule: **only fields the operator actually
 * touched are written**. A batch panel that pushes every field it displays
 * would take the primary balloon's symbol and stamp it over forty others the
 * moment you corrected a tolerance. So edits mark a field dirty, nothing is
 * written until Apply, and untouched fields are left exactly as they were.
 *
 * The second rule is that some fields cannot be shared by definition. A balloon
 * number is what distinguishes one balloon from another; "set them all to 7" is
 * never a thing anyone means. Those are refused rather than offered.
 */

/** Fields a batch edit may write. */
export type BatchField =
    'content' | 'upperTol' | 'lowerTol' | 'toleranceStandard'
    | 'quantity' | 'section' | 'isNote' | 'typeId' | 'inspectionToolId'
    | 'dimensionFeature' | 'numberCategory' | 'exportMode' | 'showArrow';

/**
 * Fields that are per-balloon by nature and are never batch-editable.
 *
 * One Supply locks the same set (`_BATCH_LOCKED_WIDGET_NAMES`): the sort index
 * there, the number and sub-number here. Setting forty balloons to number 7
 * does not produce forty balloons numbered 7 — it produces a drawing whose
 * numbering is meaningless, and no undo because the originals are gone.
 */
export const BATCH_LOCKED_FIELDS = ['balloonNumber', 'subNumber'] as const;

/** Human labels, for the panel and for the confirmation summary. */
export const BATCH_FIELD_LABELS: Record<BatchField, string> = {
    content: 'Symbol / text',
    upperTol: 'Upper tol',
    lowerTol: 'Lower tol',
    toleranceStandard: 'Tolerance standard',
    quantity: 'Quantity',
    section: 'Region',
    isNote: 'Treat as a note',
    typeId: 'Characteristic',
    inspectionToolId: 'Inspection tool',
    dimensionFeature: 'Dimension feature',
    numberCategory: 'Number category',
    exportMode: 'Export mode',
    showArrow: 'Show arrow',
};

/** A pending batch edit: the values typed, and which of them count as touched. */
export interface BatchEdit {
    values: Partial<Record<BatchField, any>>;
    dirty: Set<BatchField>;
}

export function emptyBatchEdit(): BatchEdit {
    return {values: {}, dirty: new Set<BatchField>()};
}

/**
 * What the selection has in common for a field, or `undefined` when it differs.
 *
 * Drives the panel's placeholder: showing one balloon's value for a field the
 * others disagree on invites the operator to "confirm" a change they never
 * intended. "(varies)" is the honest thing to show.
 */
export function commonValue(
    annotations: BalloonAnnotation[], field: BatchField
): any | undefined {
    if (!annotations.length) return undefined;
    const first = (annotations[0] as any)[field];
    for (const a of annotations) {
        const v = (a as any)[field];
        // Loose on null/undefined/'' so an unset field reads as agreement
        // rather than as a difference between "" and undefined.
        const same = (v ?? '') === (first ?? '');
        if (!same) return undefined;
    }
    return first;
}

export interface BatchValidation {
    ok: boolean;
    /** Why it was refused, phrased for a person. */
    message?: string;
}

/**
 * Refuse edits that would quietly destroy data across the whole selection.
 *
 * Mirrors One Supply's guards, which block an empty partition and an unset
 * ordering before applying. The asymmetry is deliberate: clearing ONE balloon's
 * region is an edit the operator can see and undo, while clearing forty is a
 * loss they will not notice until the sheet is renumbered.
 */
export function validateBatch(edit: BatchEdit): BatchValidation {
    if (!edit.dirty.size)
        return {ok: false, message: 'Change a field first — untouched fields are not written.'};

    if (edit.dirty.has('section') && !String(edit.values.section ?? '').trim())
        return {
            ok: false,
            message: 'Region cannot be blanked across a selection. Clearing it would '
                + 'drop every one of these balloons out of its grid cell at once.',
        };

    if (edit.dirty.has('quantity')) {
        const q = edit.values.quantity;
        if (q !== undefined && q !== null && q !== '') {
            const n = Number(q);
            if (!Number.isFinite(n) || n < 1 || Math.floor(n) !== n)
                return {ok: false, message: 'Quantity must be a whole number of 1 or more.'};
        }
    }
    return {ok: true};
}

/** The result of applying, so the caller can report it rather than guess. */
export interface BatchOutcome {
    annotations: BalloonAnnotation[];
    changed: number;
    fields: BatchField[];
}

/**
 * Apply the touched fields to every selected balloon.
 *
 * Pure: returns a new array, so the caller decides when to commit and the
 * change is one step rather than a scatter of per-field writes.
 *
 * Note what is NOT here: `toleranceStandard` is cleared whenever a tolerance is
 * set by hand. A tolerance the operator typed is no longer "ISO 2768-1 m", and
 * leaving the old label on it would let a later re-apply overwrite their edit.
 */
export function applyBatch(
    annotations: BalloonAnnotation[], selectedIds: Set<string>, edit: BatchEdit
): BatchOutcome {
    const fields = [...edit.dirty];
    if (!fields.length || !selectedIds.size)
        return {annotations, changed: 0, fields: []};

    let changed = 0;
    const next = annotations.map(a => {
        if (!selectedIds.has(a.id)) return a;
        changed++;
        const patch: any = {};
        for (const f of fields) {
            let v = edit.values[f];
            if (f === 'quantity')
                v = (v === '' || v === null || v === undefined) ? undefined : Number(v);
            if (f === 'typeId' || f === 'inspectionToolId')
                v = (v === '' || v === null || v === undefined) ? undefined : Number(v);
            if (f === 'dimensionFeature' || f === 'numberCategory' || f === 'exportMode')
                v = v ? String(v) : undefined;
            patch[f] = v;
        }
        // A basic or reference dimension carries no tolerance - One Supply
        // clears it the moment the feature is set - unless the same edit
        // typed one in on purpose.
        if ((patch.dimensionFeature === 'theoretical' || patch.dimensionFeature === 'reference')
            && !edit.dirty.has('upperTol') && !edit.dirty.has('lowerTol')) {
            patch.upperTol = '';
            patch.lowerTol = '';
            patch.toleranceStandard = undefined;
        }
        // A hand-typed tolerance stops being a general tolerance.
        if ((edit.dirty.has('upperTol') || edit.dirty.has('lowerTol'))
            && !edit.dirty.has('toleranceStandard'))
            patch.toleranceStandard = undefined;

        return {...a, ...patch};
    });

    return {annotations: next, changed, fields};
}

/**
 * Expand a click into a selection, given the modifier keys.
 *
 * Standard list behaviour, and worth centralising because getting it subtly
 * wrong — ctrl that clears, shift that anchors to the wrong end — is the kind
 * of thing that makes a multi-select feel broken without anyone being able to
 * say why.
 *
 * `ordered` must be the ids in the order they are shown, or a shift-range
 * selects a set the operator did not see.
 */
export function resolveSelection(
    current: Set<string>, anchor: string | null, clicked: string,
    ordered: string[], modifiers: {ctrl?: boolean; shift?: boolean}
): {selected: Set<string>; anchor: string} {
    if (modifiers.shift && anchor && ordered.includes(anchor)) {
        const from = ordered.indexOf(anchor);
        const to = ordered.indexOf(clicked);
        if (from >= 0 && to >= 0) {
            const [lo, hi] = from <= to ? [from, to] : [to, from];
            // Shift extends from the anchor and REPLACES, rather than unioning:
            // that is what every list on this platform does, and a shift that
            // accumulates makes it impossible to shrink a range.
            return {selected: new Set(ordered.slice(lo, hi + 1)), anchor};
        }
    }
    if (modifiers.ctrl) {
        const next = new Set(current);
        if (next.has(clicked)) next.delete(clicked);
        else next.add(clicked);
        // The anchor follows the last thing touched, so a later shift-click
        // ranges from where the operator actually is.
        return {selected: next, anchor: clicked};
    }
    return {selected: new Set([clicked]), anchor: clicked};
}
