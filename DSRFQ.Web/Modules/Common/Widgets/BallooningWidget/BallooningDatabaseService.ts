import {Criteria} from '@serenity-is/corelib';
import type {BalloonAnnotation, Mask} from './BallooningTypes';
import {formatBalloonNumber, parseBalloonNumber} from './BallooningNumbering';
import type {AreaRegion} from './BallooningRegions';
import {regionColor} from './BallooningRegions';
import {normalizeSortMode} from './BallooningAreaSort';
import type {CostingPartBalloonAreasRow} from '@/ServerTypes/Costing/CostingPartBalloonAreasRow';
import {CostingPartBalloonAreasService} from '@/ServerTypes/Costing/CostingPartBalloonAreasService';
import type {CostingPartBalloonsRow} from '@/ServerTypes/Costing/CostingPartBalloonsRow';
import {CostingPartBalloonsService} from '@/ServerTypes/Costing/CostingPartBalloonsService';
import type {CostingPartBalloonMaskZonesRow} from '@/ServerTypes/Costing/CostingPartBalloonMaskZonesRow';
import {CostingPartBalloonMaskZonesService} from '@/ServerTypes/Costing/CostingPartBalloonMaskZonesService';
import type {CostingPartBalloonGridsRow} from '@/ServerTypes/Costing/CostingPartBalloonGridsRow';
import {CostingPartBalloonGridsService} from '@/ServerTypes/Costing/CostingPartBalloonGridsService';
import type {GridProfile} from './BallooningGrid';
import {profileFromValues} from './BallooningGrid';

/**
 * Maps between the widget's BalloonAnnotation / Mask objects and the
 * CostingPartBalloons / CostingPartBalloonMaskZones rows.
 *
 * The mapping follows DS_ERP's BallooningDatabaseService.saveToDatabase,
 * including its soft-delete: balloons the user removed are written back with
 * RemovedByUser = 1 rather than deleted, so a later re-run of recognition can
 * tell "never seen" from "seen and rejected".
 *
 * DS_ERP saves the whole drawing in one master/detail call on the parent row.
 * There is no such parent here — the balloons hang off CostingParts, which has
 * plenty of other detail lists — so this writes the rows directly and reconciles
 * by id: existing rows are updated, new ones created, and rows that vanished
 * from the editor are deleted.
 */

interface LoadedBalloons {
    annotations: BalloonAnnotation[];
    removed: BalloonAnnotation[];
    masks: Mask[];
    /**
     * The balloon size multiplier the part was last saved with, or undefined
     * when nothing has been saved yet. Stored per row because that is the shape
     * of the table, but it is a single widget-wide setting, so the first
     * non-zero value is authoritative.
     */
    balloonSize?: number;
}

/** The green every row used to be written with before Bubble Settings existed. */
export const LEGACY_DEFAULT_COLOR = '#27dc3c';

const num = (v: any): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

export function rowToAnnotation(r: CostingPartBalloonsRow): BalloonAnnotation {
    const x1 = num(r.BBoxX1), y1 = num(r.BBoxY1);
    const x2 = num(r.BBoxX2), y2 = num(r.BBoxY2);
    const rect = {x: x1, y: y1, width: x2 - x1, height: y2 - y1};
    const qty = Number(r.Multiplier);
    return {
        // The database id doubles as the widget's identity, so a save that
        // round-trips does not orphan the row it came from.
        id: String(r.Id),
        // BalloonNo is nvarchar(40), so it may hold "5-1" as well as "5".
        // num() would have turned the former into NaN.
        ...parseBalloonNumber(r.BalloonNo),
        balloonX: num(r.CenterX),
        balloonY: num(r.CenterY),
        quantity: Number.isFinite(qty) && r.Multiplier ? qty : undefined,
        rect,
        viewRect: rect,
        content: r.Symbol ?? '',
        originalContent: r.OriginalSymbol ?? '',
        type: r.IsNote ? 'Note' : 'Dimension',
        // The catalogued characteristic, matched by the consumer as it saved
        // the balloon or picked by hand afterwards. Null stays undefined so the
        // lookup shows empty rather than a bogus id 0.
        typeId: r.FeatureSymbolId ?? undefined,
        typeName: r.FeatureSymbolName ?? '',
        upperTol: r.UpperTol ?? '',
        lowerTol: r.LowerTol ?? '',
        toleranceStandard: r.ToleranceStandard ?? undefined,
        inspectionToolId: r.InspectionToolId ?? undefined,
        inspectionToolName: r.InspectionToolName ?? '',
        section: r.Section ?? '',
        status: 'Pending',
        pageIndex: Math.max(0, num(r.PageNumber) - 1),   // stored 1-based
        auto: !r.Manual,
        gridStart: r.GridStart ?? '',
        gridEnd: r.GridEnd ?? '',
        isNote: !!r.IsNote,
        isDatum: !!r.IsDatum,
        audited: !!r.Audited,
        auditedOn: r.AuditedOn ?? undefined,
        auditedBy: r.AuditedBy ?? undefined,
        // '#27dc3c' is the constant the RFQ consumer and the old widget used
        // to stamp on every row - nobody chose it - so it means "shop default".
        balloonColor: r.BalloonColor && r.BalloonColor.toLowerCase() !== LEGACY_DEFAULT_COLOR
            ? r.BalloonColor : undefined,
        textColor: r.TextColor || undefined,
        balloonShape: (r.BalloonShape || undefined) as any,
        balloonLineWidth: r.BalloonLineWidth ?? undefined,
        balloonStyle: (r.BalloonStyle || undefined) as any,
        showArrow: r.ShowArrow ?? undefined,
        balloonScale: r.BalloonScale ? num(r.BalloonScale) : undefined,
        boxHidden: !!r.BoxHidden,
        dimensionFeature: (r.DimensionFeature || undefined) as any,
        numberCategory: r.NumberCategory || undefined,
        exportMode: (r.ExportMode || undefined) as any,
        cropRotation: r.CropRotation ?? undefined,
        analyser: {diameter: false, datums: [], modifiers: []}
    } as BalloonAnnotation;
}

export function annotationToRow(a: BalloonAnnotation, costingPartId: number,
                         removed: boolean, balloonSize: number): CostingPartBalloonsRow {
    return {
        CostingPartId: costingPartId,
        BalloonNo: formatBalloonNumber(a),
        PageNumber: a.pageIndex + 1,
        CenterX: a.balloonX,
        CenterY: a.balloonY,
        // Null follows the shop's Bubble Settings; see BallooningStyle.
        BalloonColor: a.balloonColor || null,
        TextColor: a.textColor || null,
        BalloonShape: a.balloonShape || null,
        BalloonLineWidth: a.balloonLineWidth ?? null,
        BalloonStyle: a.balloonStyle && a.balloonStyle !== 'default' ? a.balloonStyle : null,
        ShowArrow: a.showArrow ?? null,
        BalloonScale: a.balloonScale ?? null,
        BoxHidden: !!a.boxHidden,
        Audited: !!a.audited,
        AuditedOn: a.audited ? (a.auditedOn ?? null) : null,
        AuditedBy: a.audited ? (a.auditedBy ?? null) : null,
        DimensionFeature: a.dimensionFeature || null,
        // Null = this balloon's default (notes for a note, normal otherwise),
        // so a note someone moved to Normal is stored as such.
        NumberCategory: a.numberCategory && a.numberCategory !== (a.isNote ? 'notes' : 'normal') ? a.numberCategory : null,
        ExportMode: a.exportMode && a.exportMode !== 'text' ? a.exportMode : null,
        CropRotation: a.cropRotation ? a.cropRotation : null,
        BalloonSize: balloonSize,
        BBoxX1: a.rect.x,
        BBoxY1: a.rect.y,
        BBoxX2: a.rect.x + a.rect.width,
        BBoxY2: a.rect.y + a.rect.height,
        Symbol: a.content,
        OriginalSymbol: a.originalContent,
        FeatureSymbolId: a.typeId ?? null,
        UpperTol: a.upperTol,
        LowerTol: a.lowerTol,
        // null, not '': the column means "printed on the drawing" when empty,
        // and an empty string would read as a standard whose name is blank.
        ToleranceStandard: a.toleranceStandard || null,
        InspectionToolId: a.inspectionToolId ?? null,
        Multiplier: a.quantity == null ? null : String(a.quantity),
        Section: a.section,
        GridStart: a.gridStart,
        GridEnd: a.gridEnd,
        IsNote: !!a.isNote,
        IsDatum: !!a.isDatum,
        Manual: !a.auto,
        RemovedByUser: removed
    };
}

/** True when the widget id is a database id rather than a client-side uuid. */
const isPersistedId = (id: string) => /^\d+$/.test(id);

export async function loadBalloons(costingPartId: number): Promise<LoadedBalloons> {
    const annotations: BalloonAnnotation[] = [];
    const removed: BalloonAnnotation[] = [];
    const masks: Mask[] = [];
    let balloonSize: number | undefined;

    await CostingPartBalloonsService.List({
        Criteria: Criteria.and(
            Criteria('IsActive').eq(1),
            Criteria('CostingPartID').eq(costingPartId))
    }, res => {
        for (const r of res.Entities ?? []) {
            (r.RemovedByUser ? removed : annotations).push(rowToAnnotation(r));
            // Auto-ballooned rows are inserted by the RFQ consumer with
            // BalloonSize = 1; a user's saved size overwrites every row, so the
            // first non-zero value read back is the saved setting.
            if (balloonSize === undefined && num(r.BalloonSize) > 0)
                balloonSize = num(r.BalloonSize);
        }
    });

    await CostingPartBalloonMaskZonesService.List({
        Criteria: Criteria.and(
            Criteria('IsActive').eq(1),
            Criteria('CostingPartID').eq(costingPartId))
    }, res => {
        for (const r of res.Entities ?? []) {
            masks.push({
                id: String(r.Id),
                pageIndex: Math.max(0, num(r.PageNumber) - 1),
                rect: {
                    x: num(r.MaskX1),
                    y: num(r.MaskY1),
                    width: num(r.MaskX2) - num(r.MaskX1),
                    height: num(r.MaskY2) - num(r.MaskY1)
                }
            });
        }
    });

    return {annotations, removed, masks, balloonSize};
}

export async function saveBalloons(
    costingPartId: number,
    annotations: BalloonAnnotation[],
    removedAnnotations: BalloonAnnotation[],
    masks: Mask[],
    balloonSize: number,
    areas: AreaRegion[] = []
): Promise<void> {

    // What is currently in the database, so we can spot rows the editor dropped.
    const existingIds = new Set<number>();
    await CostingPartBalloonsService.List({
        Criteria: Criteria.and(
            Criteria('IsActive').eq(1),
            Criteria('CostingPartID').eq(costingPartId))
    }, res => { for (const r of res.Entities ?? []) if (r.Id != null) existingIds.add(r.Id); });

    const seen = new Set<number>();
    const all = [
        ...annotations.map(a => ({a, removed: false})),
        ...removedAnnotations.map(a => ({a, removed: true}))
    ];

    for (const {a, removed} of all) {
        const entity = annotationToRow(a, costingPartId, removed, balloonSize);
        if (isPersistedId(a.id)) {
            const id = Number(a.id);
            seen.add(id);
            await CostingPartBalloonsService.Update({EntityId: id, Entity: entity});
        } else {
            await CostingPartBalloonsService.Create({Entity: entity});
        }
    }

    // Anything present before and not accounted for now was deleted outright.
    for (const id of existingIds) {
        if (!seen.has(id)) await CostingPartBalloonsService.Delete({EntityId: id});
    }

    // Masks are few and cheap; replace them wholesale rather than reconcile.
    const existingMaskIds: number[] = [];
    await CostingPartBalloonMaskZonesService.List({
        Criteria: Criteria.and(
            Criteria('IsActive').eq(1),
            Criteria('CostingPartID').eq(costingPartId))
    }, res => { for (const r of res.Entities ?? []) if (r.Id != null) existingMaskIds.push(r.Id); });

    for (const id of existingMaskIds)
        await CostingPartBalloonMaskZonesService.Delete({EntityId: id});

    for (const m of masks) {
        const entity: CostingPartBalloonMaskZonesRow = {
            CostingPartId: costingPartId,
            PageNumber: m.pageIndex + 1,
            MaskX1: m.rect.x,
            MaskY1: m.rect.y,
            MaskX2: m.rect.x + m.rect.width,
            MaskY2: m.rect.y + m.rect.height
        };
        await CostingPartBalloonMaskZonesService.Create({Entity: entity});
    }

    await saveAreas(costingPartId, areas);
}

// ── areas ───────────────────────────────────────────────────────────────────

export async function loadAreas(costingPartId: number): Promise<AreaRegion[]> {
    const areas: AreaRegion[] = [];
    await CostingPartBalloonAreasService.List({
        Criteria: Criteria.and(
            Criteria('IsActive').eq(1),
            Criteria('CostingPartID').eq(costingPartId))
    }, res => {
        for (const r of res.Entities ?? []) {
            const order = num(r.OrderIndex) || areas.length + 1;
            const x1 = num(r.AreaX1), y1 = num(r.AreaY1);
            areas.push({
                regionId: String(r.Id),
                pageIndex: Math.max(0, num(r.PageNumber) - 1),
                orderIndex: order,
                rect: {
                    x: x1, y: y1,
                    width: num(r.AreaX2) - x1,
                    height: num(r.AreaY2) - y1
                },
                // Presentation, so it is derived rather than stored - see the
                // migration's remarks. Ordering decides the colour, which keeps
                // the palette in step after any reorder.
                color: regionColor(order - 1),
                label: r.Label || `Area ${order}`,
                // A project saved under a mode that has since been retired
                // still opens; normalizeSortMode maps it onto reading order.
                sortMode: normalizeSortMode(r.SortMode),
                startAngle: num(r.StartAngle)
            });
        }
    });
    return areas.sort((a, b) =>
        (a.pageIndex - b.pageIndex) || (a.orderIndex - b.orderIndex));
}

/**
 * Replace this part's areas wholesale.
 *
 * Areas are a handful of rows per drawing and every one of them can change at
 * once when the operator reorders them, so reconciling by id would cost more
 * round trips than it saves. Balloons are reconciled instead because their ids
 * are referenced by the removed-balloon bookkeeping.
 */
export async function saveAreas(
    costingPartId: number, areas: AreaRegion[]
): Promise<void> {
    const existing: number[] = [];
    await CostingPartBalloonAreasService.List({
        Criteria: Criteria.and(
            Criteria('IsActive').eq(1),
            Criteria('CostingPartID').eq(costingPartId))
    }, res => { for (const r of res.Entities ?? []) if (r.Id != null) existing.push(r.Id); });

    for (const id of existing)
        await CostingPartBalloonAreasService.Delete({EntityId: id});

    for (const a of areas) {
        const entity: CostingPartBalloonAreasRow = {
            CostingPartId: costingPartId,
            PageNumber: a.pageIndex + 1,
            OrderIndex: a.orderIndex,
            AreaX1: a.rect.x,
            AreaY1: a.rect.y,
            AreaX2: a.rect.x + a.rect.width,
            AreaY2: a.rect.y + a.rect.height,
            SortMode: a.sortMode,
            StartAngle: a.startAngle,
            Label: a.label
        };
        await CostingPartBalloonAreasService.Create({Entity: entity});
    }
}

// ── the sheet's grid ────────────────────────────────────────────────────────

/** One page's grid row: corrected lines, and the page's rotation and grid frame. */
export interface StoredGridProfile {
    /** The row, so a second save updates rather than adding a duplicate. */
    id: number;
    /** 1-based, matching the column. */
    pageNumber: number;
    /** Null when the page was never adjusted - the row may exist for rotation or frame alone. */
    xLines: number[] | null;
    yLines: number[] | null;
    rotation: number;
    frame: {x: number; y: number; width: number; height: number} | null;
}

/**
 * Every corrected grid on this part, by 1-based page.
 *
 * A page with no row has never been adjusted, and the widget falls back to
 * equal spacing - the same assumption recognition makes - so a missing entry
 * is a normal answer rather than an error. Unreadable JSON is skipped for the
 * same reason: a page that draws its grid evenly is recoverable, one that
 * throws on load is not.
 */
export async function loadGridProfiles(
    costingPartId: number
): Promise<Map<number, StoredGridProfile>> {
    const out = new Map<number, StoredGridProfile>();
    await CostingPartBalloonGridsService.List({
        Criteria: Criteria.and(
            Criteria('IsActive').eq(1),
            Criteria('CostingPartID').eq(costingPartId))
    }, res => {
        for (const r of res.Entities ?? []) {
            const page = num(r.PageNumber);
            if (r.Id == null || page < 1) continue;
            let xLines: unknown = null, yLines: unknown = null;
            try {
                xLines = JSON.parse(r.XLines ?? 'null');
                yLines = JSON.parse(r.YLines ?? 'null');
            } catch {
                // Unreadable lines fall back to equal spacing; the row still
                // carries the page's rotation and frame.
            }
            const profile = profileFromValues(xLines, yLines);
            const hasFrame = r.FrameX2 != null && r.FrameY2 != null
                && num(r.FrameX2) > num(r.FrameX1) && num(r.FrameY2) > num(r.FrameY1);
            out.set(page, {
                id: r.Id, pageNumber: page,
                xLines: profile?.xLines ?? null, yLines: profile?.yLines ?? null,
                rotation: num(r.Rotation),
                frame: hasFrame ? {
                    x: num(r.FrameX1), y: num(r.FrameY1),
                    width: num(r.FrameX2) - num(r.FrameX1), height: num(r.FrameY2) - num(r.FrameY1),
                } : null,
            });
        }
    });
    return out;
}

/**
 * Store one page's lines, and return the row id.
 *
 * Update when the page already has a row, create otherwise - the table holds
 * one live grid per page and a filtered unique index enforces it, so a blind
 * Create would fail the second time an operator adjusts the same sheet.
 */
export async function saveGridProfile(
    costingPartId: number, pageNumber: number,
    profile: GridProfile | null, existingId: number | null,
    extras: {rotation?: number; frame?: {x: number; y: number; width: number; height: number} | null} = {}
): Promise<number | null> {
    // Only what is given is written: an update carrying no lines leaves the
    // stored lines alone, so saving a rotation cannot wipe an adjusted grid.
    const entity: CostingPartBalloonGridsRow = {
        CostingPartId: costingPartId,
        PageNumber: pageNumber,
    };
    if (profile) {
        entity.XLines = JSON.stringify(profile.xLines);
        entity.YLines = JSON.stringify(profile.yLines);
    }
    if (extras.rotation !== undefined) entity.Rotation = extras.rotation;
    if (extras.frame !== undefined) {
        const f = extras.frame;
        entity.FrameX1 = f ? f.x : null as any;
        entity.FrameY1 = f ? f.y : null as any;
        entity.FrameX2 = f ? f.x + f.width : null as any;
        entity.FrameY2 = f ? f.y + f.height : null as any;
    }
    if (existingId != null) {
        await CostingPartBalloonGridsService.Update({
            EntityId: existingId, Entity: {...entity, Id: existingId},
        });
        return existingId;
    }
    let created: number | null = null;
    await CostingPartBalloonGridsService.Create({Entity: entity},
        res => { created = (res as any)?.EntityId ?? null; });
    return created;
}
