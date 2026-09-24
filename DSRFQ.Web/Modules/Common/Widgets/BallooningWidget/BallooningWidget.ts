import {BalloonAnnotation, ForceDirectedBalloonLayout, Mask, Rect, ToolMode} from './BallooningTypes';
import {getIcon} from './Icon';
// Not crypto.randomUUID(): that only exists on https:// and localhost, so over
// Tailscale (http://100.68.166.119:5001) adding a balloon or a mask threw.
import {newId} from '../../Helpers/NewId';
import {checkSheetLines, downloadCheckSheetExcel, openCheckSheet as showCheckSheet} from './BallooningCheckSheet';
import {BallooningWidgetCss} from './BallooningWidgetCss';
// Brings pdf-lib into the workspace bundle - roughly 700 KB. Worth it for a
// real export; it was NOT worth it previously, when the only thing imported
// from here was resequenceFromPoint, which the old Renumber called with
// deletedNumber = 0 and then overwrote every number it had just changed.
import {computeBalloonSizePct, exportToAnnotatedPdf} from './BallooningMethod';
import {
    LookupEditor, notifyError, notifySuccess, notifyWarning, resolveServiceUrl
} from '@serenity-is/corelib';
import {FeatureSymbolsRow} from '@/ServerTypes/Master/FeatureSymbolsRow';
import {InspectionToolsRow} from '@/ServerTypes/Master/InspectionToolsRow';
import {saveBalloons, loadBalloons, loadAreas} from './BallooningDatabaseService';
import {
    hydrateSettings, getDatumSettings, saveDatumSettings, canEditShopSettings,
} from './BallooningSettingsStore';
import type {GridProfile} from './BallooningGrid';
import {
    belongFromProfile, buildEqualProfile, expectedLineCounts,
    isProfileValidFor, moveLine, parseGridExtent, profileFromValues,
} from './BallooningGrid';
import {loadGridProfiles, saveGridProfile} from './BallooningDatabaseService';
import {CostingPartsService, RerunStage} from '@/ServerTypes/Costing/CostingPartsService';
import mqtt from 'mqtt';
import {buildGdtPalette} from './BallooningGdtPalette';
import {
    compareBalloonNumber, formatBalloonNumber, expandByQuantity,
    DEFAULT_SUB_SEPARATOR, REGION_UNMATCHED,
    SUB_SEPARATORS, MAX_SUB_SEPARATOR_LENGTH,
    INSTANCE_SEPARATOR, isValidSubSeparator, loadSubSeparator, saveSubSeparator,
} from './BallooningNumbering';
// Type-only, so it must be imported as such: tsconfig sets isolatedModules,
// under which esbuild transpiles each file alone and would otherwise emit a
// runtime import for a binding that only exists at compile time.
import type {SubSeparator} from './BallooningNumbering';
import {pageGridSystem} from './BallooningNumbering';
import {
    AreaRegion, makeRegion, resequenceRegions, rectsOverlap,
    regionContains, orderByRegions, applyNumbering,
} from './BallooningRegions';
import {AREA_SORT_GROUPS, normalizeSortMode} from './BallooningAreaSort';
import type {AreaSortMode} from './BallooningAreaSort';
import {
    DEFAULT_ALWAYS_FILTER_KEYWORDS, findFiltered, loadAlwaysFilterKeywords,
    normalizeKeyword, saveAlwaysFilterKeywords, sortKeywordList,
} from './BallooningKeywordFilter';
import {
    calcForSource, isReferenceForTolerance, isTheoreticalDimension, isToleranceLogicValid,
    loadToleranceSettings, sourceFromStandard, sourceStandard, standardOptions,
} from './BallooningTolerance';
import {openToleranceDialog} from './BallooningToleranceDialog';
import {
    UndoHistory, closeNumberGap, cropGeometry, deleteBalloons, isContinuousNumbering, listOrder,
    moveBalloonNumber, renumberAcrossPages,
} from './BallooningEditing';
import {
    DEFAULT_BUBBLE_STYLE, loadBubbleStyle, resolveBalloonStyle, saveBubbleStyle, shapeSvg,
    textAnchorY, textScale,
} from './BallooningStyle';
import type {BubbleStyle} from './BallooningStyle';
import {
    DIMENSION_FEATURES, EXPORT_MODES, NUMBER_CATEGORIES, applySymbolFilter, categoryLabel, categoryRank, effectiveCategory,
    filterForExport, formatQuantityRange, groupGdtWithDimensions, isReferenceBalloon, isTheoreticalBalloon,
    loadCategoryOrder, loadEditorDefaults, loadPdfExportOptions, loadSymbolFilter, nextUnaudited,
    parseQuantityInput, saveCategoryOrder, saveEditorDefaults, savePdfExportOptions, saveSymbolFilter,
    splitTolerance,
} from './BallooningFields';
import type {EditorDefaults} from './BallooningFields';
import {
    bubbleSettingsDialog, categoryOrderDialog, clearScopeDialog, defaultToolDialog, gridEditDialog, openBalloonMenu,
    pdfExportDialog, sizeScopeDialog, symbolFilterDialog,
} from './BallooningDialogs';
import type {BalloonMenuAction} from './BallooningDialogs';
import {CostingPartBalloonsService} from '@/ServerTypes/Costing/CostingPartBalloonsService';
import {
    ViewLinkData, VIEW_LINK_CSS, isLinked, linkTarget, loadViewLinks, renderViewLinks, viewOf, PctRect
} from './BallooningViewLinks';
import {Authorization, getLookupAsync, notifyInfo} from '@serenity-is/corelib';

/** A remembered on/off preference for this browser. */
function readPref(key: string, fallback: boolean): boolean {
    try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : v === '1';
    } catch {
        return fallback;
    }
}

function writePref(key: string, value: boolean): void {
    try { localStorage.setItem(key, value ? '1' : '0'); } catch { /* private browsing */ }
}
import {
    applyBatch, commonValue, emptyBatchEdit, resolveSelection, validateBatch,
    BATCH_FIELD_LABELS,
} from './BallooningBatch';
import type {BatchEdit, BatchField} from './BallooningBatch';
import {
    findStructuralMatches, loadDimensionFilters, saveDimensionFilters,
} from './BallooningDimensionFilter';

/**
 * Ballooning editor, ported from DS_ERP's BallooningWidget.
 *
 * Structure, class names and interaction model follow the original so the two
 * stay comparable. What is deliberately NOT here, because it depends on DS_ERP
 * modules DSRFQ has no equivalent of: approval stamps (StampTemplates), check
 * sheet conversion (Sqc), file-server upload, gauges/machines/special tools,
 * and tolerance scoring.
 *
 * Auto-recognition is present in the toolbar but not yet connected — it needs
 * the RPA\API middleware endpoint, which is a separate piece of work.
 *
 * Coordinates are percent of page (0-100) throughout, as in the original, so a
 * balloon stays on its geometry regardless of render resolution or zoom.
 */
export class BallooningWidget {
    /** Layout width of the drawing surface in CSS px; zoom scales it. */
    private static readonly BASE_WIDTH = 1000;

    private container: HTMLElement;
    private costingPartId: number;

    private fdLayout = new ForceDirectedBalloonLayout();
    private containerWidth = 1000;
    private containerHeight = 1400;

    private pages: string[] = [];
    private annotations: BalloonAnnotation[] = [];
    /** Soft-deleted balloons, kept so a save records the removal. */
    private removedAnnotations: BalloonAnnotation[] = [];
    private masks: Mask[] = [];

    private currentPage = 0;
    /**
     * The page src currently loaded into the <img>.
     *
     * Tracked here rather than read back off imgEl.src, because the browser
     * normalises what it is given: a path containing a space comes back
     * percent-encoded, so comparing against the raw path never matched and the
     * image was reassigned on every render. Its onload re-entered renderCanvas,
     * which rebuilt the toolbar about twice a second -- the Next-page button was
     * detached before a click could land on it, and the wheel's zoom was undone
     * by fitToViewport on the way round. Only part 25 showed it, because only
     * its filename has a space: "..._Green_Standard (2).pdf".
     */
    private loadedPageSrc: string | null = null;
    /**
     * The PRIMARY selection - what the property editor shows and what the
     * canvas scrolls to. Kept as its own field rather than derived from
     * selectedIds because every existing path already reads it.
     */
    private selectedId: string | null = null;
    /**
     * Everything selected, primary included. Size 1 in the ordinary case; more
     * than one puts the property panel into batch mode.
     */
    private selectedIds = new Set<string>();
    /** The balloon list's filter text; survives re-renders, cleared by the operator. */
    private tableFilter = '';
    /** The balloon the list last scrolled to, so it follows selection without fighting the operator's own scrolling. */
    private tableScrolledTo: string | null = null;
    /**
     * Where the operator has the list scrolled to. Kept here, updated as they
     * scroll, rather than read off the old list when re-rendering: a click in
     * the workspace can rebuild the list inside a brand-new container, and a
     * new container has no old scroll position to read.
     */
    private tableScrollTop = 0;
    private tableScrollLeft = 0;
    /** Where a shift-range measures from - the last plainly-clicked balloon. */
    private selectionAnchor: string | null = null;
    /** The pending batch edit, so typing survives a re-render of the panel. */
    private batchEdit: BatchEdit = emptyBatchEdit();
    /** Whether the filter dialog's structural section is expanded. */
    private structuralOpen = false;
    private toolMode: ToolMode = 'select';
    private scale = 1;
    private pan = {x: 0, y: 0};
    private balloonSizeMultiplier = 1.0;
    private isSaving = false;
    /**
     * Unsaved edits. An accessor, because marking the drawing dirty is the one
     * thing every edit path does last - so it is where an undo step is taken,
     * rather than a push in each of the thirty-odd places balloons change.
     */
    private _dirty = false;
    private get dirty(): boolean { return this._dirty; }
    private set dirty(value: boolean) {
        this._dirty = value;
        if (value) this.recordHistory();
    }
    /** Undo/redo over whole-drawing snapshots. See BallooningEditing.UndoHistory. */
    private history = new UndoHistory(50);
    private beforeUnloadHandler: ((e: BeforeUnloadEvent) => void) | null = null;
    /** Page image sizes as measured - for row crops and for pages not on screen. */
    private pageSizes = new Map<number, {w: number; h: number}>();
    private pageSizesPending = new Set<number>();
    private pageSizeRender: any = null;
    /** List every page's balloons, or just the page on screen. Remembered per browser. */
    private tableAllPages = readPref('dsrfq.ballooning.listAllPages', true);
    /** Show each row's dimension as cut from the drawing. */
    private tableImages = readPref('dsrfq.ballooning.listImages', true);

    // ── One Supply's editor state ────────────────────────────────────────
    /** The shop's Bubble Settings, which every unstyled balloon follows. */
    private shopStyle: BubbleStyle = {...DEFAULT_BUBBLE_STYLE};
    /** Number categories in the order Renumber walks them. */
    private categoryOrder: string[] = loadCategoryOrder();
    private editorDefaults: EditorDefaults = loadEditorDefaults();
    /** The balloon waiting for its parent to be clicked ("Set as sub-number"). */
    private pickParentFor: string | null = null;
    /** The rubber band being dragged, page percent. */
    private marquee: {start: {x: number; y: number}; rect: Rect; additive: boolean} | null = null;
    /** A right-button drag pans; one that moved must not also open the menu. */
    private rightPanMoved = false;
    /** Did the pointer move with a button down since the last press? A click is not a drag. */
    private pointerMoved = false;
    private closeBalloonMenuFn: (() => void) | null = null;
    /** View rotation by page index, degrees. */
    private pageRotation = new Map<number, number>();
    /** The drawing border the grid divides, by page index. Absent = whole page. */
    private pageFrame = new Map<number, Rect>();
    /** Grid-table row ids by 1-based page, including rows holding only rotation or frame. */
    private gridRowIds = new Map<number, number>();
    /** After "select the drawing border": whether to re-file, and where. */
    private pendingFrameApply: {recalc: boolean; allPages: boolean} | null = null;
    /** Recognition boxes drawn at all. A view preference, per browser. */
    private showBoxes = readPref('dsrfq.ballooning.showBoxes', true);
    private recognizing = false;
    /** The property panel's crop preview zoom. */
    private cropZoom = 1;
    /**
     * Which separator child numbers print with, "-" or ".". Only affects
     * display and what gets written to BalloonNo; parseBalloonNumber accepts
     * either on the way back in, so changing it cannot orphan saved work.
     */
    private subSeparator: SubSeparator = loadSubSeparator();
    /** The part's unit, set by the host, for the check sheet's Unit column. */
    public partUnit = '';
    // ── the sheet's grid ─────────────────────────────────────────────────
    /** Draw the grid over the drawing? Off by default; it is a working aid. */
    private showGrid = false;
    /** Are the lines draggable? Implies showGrid. */
    private adjustGrid = false;
    /** This page's lines, or null when the page has never been adjusted. */
    private gridProfile: GridProfile | null = null;
    /** The stored row, so a second save updates rather than duplicates. */
    private gridRowId: number | null = null;
    /** Profiles by 1-based page, as read back - so a page switch is instant. */
    private gridByPage = new Map<number, {id: number | null; profile: GridProfile}>();

    /** Is the Settings dropdown showing? The toolbar re-renders often. */
    private settingsMenuOpen = false;
    /** The click-away handler while that menu is open, so it can be removed. */
    private settingsAwayHandler: ((e: Event) => void) | null = null;
    /** The floating menu itself, which lives outside the toolbar. */
    private settingsMenuEl: HTMLElement | null = null;

    /**
     * Areas drawn on the sheet, across all pages. Each carries its own sort
     * rule; Renumber walks them in orderIndex and numbers each area's contents
     * by that rule. Persisted to CostingPartBalloonAreas alongside the
     * balloons, because they decide what Renumber produces - losing them on a
     * reload would make the same button give a different answer.
     */
    private regions: AreaRegion[] = [];
    /** Section / detail views and where each was cut - see BallooningViewLinks. */
    private viewLinks: ViewLinkData[] = [];
    /** The link just jumped along, drawn highlighted for a moment. */
    private viewLinkHot: string | null = null;
    private viewLinkHotTimer: number | undefined;
    /** Where to centre once a page switched to has loaded and been fitted. */
    private pendingFocus: {pageIndex: number; rect: PctRect} | null = null;
    private selectedRegionId: string | null = null;
    /** The open right-click menu, so it can be dismissed from anywhere. */
    private regionMenuEl: HTMLElement | null = null;
    /** Whether the property panel's numbering/region fold is open. */
    private propsMoreOpen = false;
    /** Live progress subscription, so recognition needs no page refresh. */
    private mqttClient: any = null;
    private reloadTimer: any;
    /** Latest consumer message for this part, shown in the toolbar. */
    private progressText = '';
    /** The source PDF behind the pages, for Export. See setSource. */
    private sourceUrl: string | null = null;
    private sourceName = 'drawing.pdf';
    private isExporting = false;
    /** The open Y14.5 symbol editor, and the field it is bound to. */
    private gdtPaletteEl: HTMLElement | null = null;
    private gdtPaletteField: HTMLTextAreaElement | null = null;

    // Drawing a new rectangle
    private isDragging = false;
    private dragStart: { x: number; y: number } | null = null;
    private currentRect: Rect | null = null;

    // Panning the viewport
    private isPanning = false;
    private panStart: { x: number; y: number } | null = null;

    // Moving / resizing an existing annotation box
    private isDraggingBox = false;
    private isResizingBox = false;
    private activeBox: { rect: Rect } | null = null;
    private boxResizeHandle: string | null = null;
    private boxMinSizePct = 0.2;
    private dragStartBoxCoords: { x: number; y: number } | null = null;
    private originalBoxRect: Rect | null = null;

    // Moving the balloon marker itself, independently of its box
    private isDraggingBalloon = false;
    private draggedBalloonId: string | null = null;
    private dragStartRaw: { x: number; y: number } | null = null;

    private toolbarEl!: HTMLElement;
    private pagebarEl!: HTMLElement;
    private viewportEl!: HTMLElement;
    private canvasContainerEl!: HTMLElement;
    private propertyEditorEl!: HTMLElement;
    private tableEl!: HTMLElement;
    private sidebarEl!: HTMLElement;

    constructor(container: HTMLElement, costingPartId: number) {
        this.container = container;
        this.costingPartId = costingPartId;
        // Global rather than in the container's CSS: the list's view tag is
        // drawn in the attached panels, outside this widget's DOM.
        if (!document.getElementById('ab-view-link-css')) {
            const style = document.createElement('style');
            style.id = 'ab-view-link-css';
            style.textContent = VIEW_LINK_CSS;
            document.head.appendChild(style);
        }
        this.renderLayout();
        this.bindGlobalEvents();
        this.connectProgress();
        this.renderAll();
    }

    // ─── Public surface ──────────────────────────────────────────────────

    /**
     * The document the pages came from, so Export can annotate the real PDF.
     *
     * Without it the export can only rebuild a PDF from the rendered page
     * images, which turns a vector drawing into a photograph of itself - the
     * text stops being selectable and stops scaling. Optional: the widget
     * works without it, Export just falls back.
     */
    public setSource(url: string | null, fileName?: string) {
        this.sourceUrl = url;
        this.sourceName = fileName || 'drawing.pdf';
    }

    /** Page image URLs, in order. Call whenever the document changes. */
    public async setPages(pages: string[]) {
        this.pages = pages ?? [];
        this.currentPage = 0;
        // A different document may reuse page 0's path shape; forget what was
        // loaded so the first render actually swaps the image.
        this.loadedPageSrc = null;
        this.selectedId = null;
        await this.load();
        this.renderAll();
    }

    public hasUnsavedChanges(): boolean { return this.dirty; }

    /** Drop the live progress subscription. Call when the widget goes away. */
    public destroy() {
        this.closeSettingsMenu();   // detaches its listeners and removes the layer
        if (this.beforeUnloadHandler) window.removeEventListener('beforeunload', this.beforeUnloadHandler);
        this.beforeUnloadHandler = null;
        clearTimeout(this.reloadTimer);
        try { this.mqttClient?.end(true); } catch { /* already closed */ }
        this.mqttClient = null;
    }

    // ─── Live progress ───────────────────────────────────────────────────

    /**
     * Watch the consumer's Progress topic and pull the balloons in as they are
     * written, so Auto Balloon does not need a page refresh to show its work.
     *
     * Same broker and topic the parts grid uses. The payload carries only
     * {Id, Message}; the balloons themselves go to the database, so a message
     * for this part is a signal to re-read rather than data to render.
     */
    private connectProgress() {
        if (this.mqttClient) return;
        try {
            // The broker sits beside the web server, so reach it by whatever
            // host the page was loaded from. "localhost" would mean the
            // VIEWER's machine for anyone browsing in over Tailscale.
            const client = mqtt.connect(`ws://${location.hostname}:15675/ws`,
                {username: 'guest', password: 'guest'});
            this.mqttClient = client;

            client.on('connect', () => client.subscribe('Progress'));
            client.on('error', () => { /* broker down: the widget still works */ });
            client.on('message', (_topic, payload) => {
                let msg: any;
                try { msg = JSON.parse(payload.toString()); } catch { return; }
                if (Number(msg?.Id) !== this.costingPartId) return;

                this.progressText = String(msg.Message ?? '');
                this.renderToolbar();

                // Debounced: ballooning reports once per page, and re-reading
                // on every one of them would reload the whole set repeatedly
                // while the run is still going.
                clearTimeout(this.reloadTimer);
                this.reloadTimer = setTimeout(() => this.reloadFromServer(), 1500);
            });
        } catch (e) {
            console.warn('Live progress unavailable', e);
        }
    }

    /**
     * Re-read this part's balloons and redraw.
     *
     * Refuses while there are unsaved edits: the operator's work is in memory
     * only, and replacing the set would discard it silently. That is also why
     * Auto Balloon asks about unsaved changes before it starts.
     */
    private async reloadFromServer() {
        if (this.dirty) {
            notifyWarning('New balloons are ready, but you have unsaved changes. '
                + 'Save or discard them, then reopen this drawing to see them.');
            return;
        }
        try {
            const loaded = await loadBalloons(this.costingPartId);
            this.annotations = loaded.annotations;
            this.removedAnnotations = loaded.removed;
            this.masks = loaded.masks;
            if (loaded.balloonSize && loaded.balloonSize > 0)
                this.balloonSizeMultiplier = loaded.balloonSize;
            this.selectedId = null;
            this.selectedIds = new Set();
            this.dirty = false;
            this.history.reset(this.snapshot());
            this.progressText = '';
            this.renderAll();
        } catch (e) {
            console.error('Could not reload balloons', e);
        }
    }

    /**
     * Moves the balloon table and property editor out of the widget's own
     * sidebar and into host-supplied elements — the workspace tray, in practice.
     * The internal sidebar is then hidden so the drawing gets the full stage.
     *
     * Safe to call repeatedly: the tray is re-rendered whenever the mode
     * changes, which replaces these elements, so the widget has to be pointed
     * at the new ones each time.
     */
    public attachPanels(tableHost: HTMLElement, propertyHost: HTMLElement) {
        this.tableEl = tableHost;
        this.propertyEditorEl = propertyHost;
        this.sidebarEl.style.display = 'none';
        this.renderProperties();
        this.renderTable();
        // The viewport just got wider; re-fit so the drawing uses it.
        this.fitToViewport();
        this.renderCanvas();
    }

    /** Re-fit after the host becomes visible; the stage has no size while hidden. */
    public resize() { this.renderCanvas(); }

    // ─── Persistence ─────────────────────────────────────────────────────

    private async load() {
        try {
            // The shop's conventions first, and awaited: the separator decides
            // how every child balloon below is formatted, and the tolerance
            // settings are read per balloon. Reading them after the balloons
            // would render the sheet once with this browser's cached values
            // and only then correct itself.
            //
            // Never throws - a settings row that cannot be read leaves each
            // module on its own defaults - so it does not need its own catch.
            await hydrateSettings();

            // Re-read the separator. Unlike the other three, which are read
            // lazily at the point of use, this one is a field initializer and
            // so ran at construction - before the row had been fetched. Without
            // this line a browser that had never opened this drawing showed the
            // default "-" while the shop was set to "." or "/".
            this.subSeparator = loadSubSeparator();
            this.shopStyle = loadBubbleStyle();
            this.categoryOrder = loadCategoryOrder();
            this.editorDefaults = loadEditorDefaults();

            const loaded = await loadBalloons(this.costingPartId);
            this.annotations = loaded.annotations;
            this.removedAnnotations = loaded.removed;
            this.masks = loaded.masks;
            // Areas decide what Renumber produces, so they have to come back
            // with the balloons or the same button gives a different answer
            // after a reload.
            this.regions = await loadAreas(this.costingPartId);
            this.viewLinks = await loadViewLinks(this.costingPartId);
            // Corrected grids, if anyone has adjusted this part. A page with
            // none falls back to equal spacing when the grid is switched on.
            this.gridByPage.clear();
            this.gridRowIds.clear();
            this.pageRotation.clear();
            this.pageFrame.clear();
            for (const [page, stored] of await loadGridProfiles(this.costingPartId)) {
                this.gridRowIds.set(page, stored.id);
                if (stored.xLines && stored.yLines)
                    this.gridByPage.set(page, {
                        id: stored.id,
                        profile: {xLines: stored.xLines, yLines: stored.yLines},
                    });
                // The same row carries the page's rotation and grid frame.
                if (stored.rotation) this.pageRotation.set(page - 1, stored.rotation);
                if (stored.frame) this.pageFrame.set(page - 1, stored.frame);
            }
            // Restore the saved balloon size. Without this the multiplier reset
            // to 1.0 on every load, so a saved size looked like it had not been
            // saved at all -- it was written, just never read back.
            if (loaded.balloonSize && loaded.balloonSize > 0)
                this.balloonSizeMultiplier = loaded.balloonSize;
            this.dirty = false;
            // A fresh drawing: nothing before this point can be undone.
            this.history.reset(this.snapshot());
            this.pageSizes.clear();
        } catch (e) {
            console.error('Could not load balloons', e);
            notifyError('Could not load existing balloons for this part.');
        }
    }

    private async handleSave() {
        if (this.isSaving) return;
        this.isSaving = true;
        this.renderToolbar();
        try {
            await saveBalloons(this.costingPartId, this.annotations,
                this.removedAnnotations, this.masks, this.balloonSizeMultiplier,
                this.regions);
            this.dirty = false;
            notifySuccess('Balloons saved.');
        } catch (e) {
            console.error('Balloon save failed', e);
            notifyError('Could not save balloons. Your changes are still on screen.');
        } finally {
            this.isSaving = false;
            this.renderToolbar();
        }
    }

    // ─── Undo / redo ─────────────────────────────────────────────────────

    /** Everything an edit can change, as one string. */
    private snapshot(): string {
        return JSON.stringify({
            annotations: this.annotations,
            removed: this.removedAnnotations,
            masks: this.masks,
            regions: this.regions,
            size: this.balloonSizeMultiplier,
        });
    }

    /** Take a step - unless a drag is still under way; that becomes one step on release. */
    private recordHistory() {
        if (this.isDraggingBox || this.isResizingBox || this.isDraggingBalloon) return;
        this.history.record(this.snapshot());
        this.updateUndoButtons();
    }

    private restoreSnapshot(state: string) {
        const s = JSON.parse(state);
        this.annotations = s.annotations ?? [];
        this.removedAnnotations = s.removed ?? [];
        this.masks = s.masks ?? [];
        this.regions = s.regions ?? [];
        if (s.size > 0) this.balloonSizeMultiplier = s.size;

        const alive = new Set([...this.annotations.map(a => a.id), ...this.masks.map(m => m.id)]);
        this.selectedIds = new Set([...this.selectedIds].filter(id => alive.has(id)));
        if (this.selectedId && !alive.has(this.selectedId))
            this.selectedId = this.selectedIds.size ? [...this.selectedIds][0] : null;
        this.batchEdit = emptyBatchEdit();
        // The field, not the setter: going back a step is not a new step.
        this._dirty = true;
        this.renderAll();
    }

    private undo() {
        // An edit nothing has recorded yet is still undoable.
        this.history.record(this.snapshot());
        const state = this.history.undo();
        if (state !== null) this.restoreSnapshot(state);
    }

    private redo() {
        const state = this.history.redo();
        if (state !== null) this.restoreSnapshot(state);
    }

    private updateUndoButtons() {
        const undo = this.toolbarEl?.querySelector('#btn-undo') as HTMLButtonElement | null;
        const redo = this.toolbarEl?.querySelector('#btn-redo') as HTMLButtonElement | null;
        if (undo) undo.disabled = !this.history.canUndo;
        if (redo) redo.disabled = !this.history.canRedo;
    }

    /**
     * Is this widget the one being used? Its keyboard shortcuts must not act
     * while the workspace shows 2D or 3D, or while one of its dialogs is open.
     */
    private isOnScreen(): boolean {
        return !!this.container.offsetParent
            && !this.container.querySelector('.ab-modal-overlay');
    }

    // ─── Layout ──────────────────────────────────────────────────────────

    private renderLayout() {
        this.container.innerHTML = `
        ${BallooningWidgetCss()}
        <style>
          /* Host overrides. Kept here rather than edited into the copied
             BallooningWidgetCss so that file stays diffable against DS_ERP.
             All three exist because the widget was written to own a full page
             there, and here it lives inside the workspace stage. */

          /* DS_ERP sizes this 'calc(100vh - 200px)', which inside the stage
             leaves it taller than its container and clips the table. */
          .ab-app-container { height: 100%; }

          /* The sidebar declares both width:500px and flex:1, so it grew to
             half the stage. Pin it and let the drawing take the rest. */
          .ab-workspace > div:last-child { flex: 0 0 auto; width: 340px; min-width: 0; }

          /* height:100% on the editor made it fill the whole sidebar and push
             the balloon table off the bottom. Split the column instead: editor
             on top sized to its content, table takes what is left. */
          .ab-property-editor {
            flex: 0 1 auto;
            width: 100%;
            height: auto;
            max-height: 55%;
            overflow-y: auto;
          }
          .ab-table-container { height: auto; flex: 1 1 auto; min-height: 140px; }

          /* Drawing symbols render in the ASME Y14.5M face declared in
             Content/site/site.css. Without it the GD&T glyphs -- position,
             flatness, perpendicularity, datum references -- fall back to a
             system font and show as boxes or unrelated characters.
             The fallbacks keep plain text legible if the face fails to load. */
          .ab-symbol {
            font-family: 'Y14_5M', 'Segoe UI Symbol', system-ui, sans-serif;
          }
          /* The table's symbol column carries real drawing text, which is often
             long; let it wrap rather than stretching the column. */
          td.ab-symbol {
            white-space: normal;
            word-break: break-word;
          }
          div.ab-table-header { flex-direction: column; align-items: stretch; gap: 6px; }
          .ab-table-head-row {
            display: flex; align-items: center; justify-content: space-between; gap: 8px;
          }
          .ab-table-scope {
            flex: 1 1 auto; min-width: 0; max-width: 240px;
            padding: 4px 6px; font-size: 12px; font-weight: 600;
            border: 1px solid var(--border-color, #d1d5db); border-radius: 6px;
            background: var(--bg-panel, #fff); color: inherit;
          }
          .ab-table-toggle {
            display: inline-flex; align-items: center; gap: 4px;
            font-size: 12px; font-weight: 400; white-space: nowrap; cursor: pointer;
          }
          .ab-table-toggle input { margin: 0; }
          .ab-crop {
            display: block;
            background-repeat: no-repeat;
            background-color: #fff;
            border: 1px solid var(--border-color, #e5e7eb);
            border-radius: 3px;
          }
          .ab-c-page { text-align: center; color: var(--text-muted, #64748b); }
          /* Shown by a host that is too narrow for the tolerance columns. */
          .ab-c-tolinline { display: none; }
          .ab-table-title { min-width: 0; }

          /* ── One Supply editor additions ─────────────────────────────── */
          .ab-zone {
            display: inline-block; margin-left: 6px; padding: 0 5px;
            border-radius: 4px; font-size: 10px; font-weight: 600; vertical-align: middle;
            background: #e5e7eb; color: #374151;
          }
          .ab-zone-a { background: #dcfce7; color: #166534; }
          .ab-zone-b { background: #dbeafe; color: #1e40af; }
          .ab-zone-c { background: #fef9c3; color: #854d0e; }
          .ab-zone-none { background: #fee2e2; color: #991b1b; }
          .ab-c-audit { width: 1%; text-align: center; }
          /* The selected balloon's number can be changed in place: say so on
             hover, quietly, and only on that row - an underline on every row
             would promise a click that first has to select. */
          tr.selected .ab-no-editable { cursor: text; }
          tr.selected .ab-no-editable:hover .ab-no-label { text-decoration: underline dotted; text-underline-offset: 3px; }
          .ab-no-input {
            width: 4.2em; padding: 1px 4px; font: inherit; font-weight: 700;
            border: 1px solid var(--bs-primary, #2563eb); border-radius: 4px;
            background: var(--bs-body-bg, #fff); color: inherit;
          }
          .ab-audit-tick {
            border: 1px solid #d1d5db; background: transparent; color: transparent;
            width: 20px; height: 20px; border-radius: 4px; cursor: pointer; font-size: 12px; line-height: 1;
          }
          .ab-audit-tick:hover { color: #9ca3af; }
          .ab-audit-tick.on { background: #16a34a; border-color: #16a34a; color: #fff; }
          .ab-btn.ab-btn-audited { background: #dcfce7; border-color: #16a34a; color: #166534; }
          .ab-annotation-box.audited .ab-annotation-bg { background: rgba(22, 163, 74, .16); }
          .ab-annotation-box.ab-box-hidden { border-style: dashed !important; opacity: .7; }
          .ab-marquee {
            position: absolute; z-index: 20; pointer-events: none;
            border: 1px dashed #2563eb; background: rgba(37, 99, 235, .08);
          }
          .ab-drawing-preview.ocr-mode { border-color: #7c3aed !important; background: rgba(124, 58, 237, .10) !important; }
          .ab-drawing-preview.frame-mode { border-color: #0f766e !important; background: rgba(15, 118, 110, .06) !important; }
          .ab-grid-frame {
            position: absolute; z-index: 1; pointer-events: none;
            border: 2px solid rgba(15, 118, 110, .7);
          }
          .ab-picking-parent, .ab-picking-parent * { cursor: copy !important; }
          .ab-balloon-badge.ab-picking { filter: drop-shadow(0 0 2px #7c3aed); }
          .ab-overlay-mask.selected { outline: 2px solid #dc2626; }
          .ab-region.movable { cursor: move; }
          .ab-pagebar { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 6px;
            padding: 3px 8px; border-bottom: 1px solid var(--ab-border, #e2e8f0); flex: 0 0 auto; }
          .ab-pagebar-tools, .ab-pagebar-pages { display: flex; align-items: center; gap: 6px; }
          .ab-page-goto { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500; }
          .ab-page-goto .ab-input { width: 48px; padding: 2px 4px; text-align: center; }
          .ab-label-link { margin-left: 6px; font-size: 11px; font-weight: 400; text-transform: none; }
          .ab-insert { margin-top: 4px; width: auto; min-width: 140px; font-size: 13px; }
          .ab-crop-preview {
            border: 1px solid var(--border-color, #e5e7eb); border-radius: 6px;
            margin-bottom: 8px; background: #fff;
          }
          .ab-crop-stage {
            height: 110px; overflow: hidden; display: flex; align-items: center; justify-content: center;
            cursor: zoom-in;
          }
          .ab-crop-inner { transition: transform .1s; }
          .ab-crop-tools {
            display: flex; gap: 2px; align-items: center; padding: 3px 6px;
            border-top: 1px solid var(--border-color, #e5e7eb);
          }
          .ab-crop-tools .ab-btn { padding: 1px 5px; font-size: 11px; min-width: 0; }
          .ab-crop-angle { margin-left: auto; font-size: 11px; color: #64748b; }

          .ab-balloon-menu { min-width: 280px; padding: 6px 0; z-index: 1000; }
          .ab-bm-head { padding: 2px 12px 6px; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; }
          .ab-bm-row { display: flex; align-items: center; gap: 8px; padding: 3px 12px; }
          .ab-bm-label { width: 42px; font-size: 12px; color: #475569; }
          .ab-bm-opts { display: flex; flex-wrap: wrap; gap: 3px; }
          .ab-bm-opts input[type=color] { width: 36px; height: 22px; padding: 0; border: 1px solid #d1d5db; }
          .ab-pill {
            border: 1px solid #d1d5db; background: #fff; color: #334155; border-radius: 10px;
            padding: 1px 8px; font-size: 11px; cursor: pointer; line-height: 1.6;
          }
          .ab-pill:hover { background: #f1f5f9; }
          .ab-pill.on { background: #2563eb; border-color: #2563eb; color: #fff; }
          .ab-pill button { border: none; background: none; color: inherit; cursor: pointer; padding: 0 0 0 4px; }
          .ab-menu-danger { color: #b91c1c; }
          .ab-sym-pills { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; font-size: 12px; }
          .ab-bs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; font-size: 12px; }
          .ab-bs-grid label { display: flex; flex-direction: column; gap: 3px; }
          .ab-bs-grid label.ab-check { flex-direction: row; align-items: center; grid-column: 1 / -1; }
          .ab-bs-grid input[type=color] { width: 100%; height: 28px; padding: 0; }
          .ab-bs-preview { display: flex; justify-content: center; margin-top: 10px; }
          .ab-cat-list { margin: 0; padding-left: 20px; }
          .ab-cat-list li { display: flex; align-items: center; gap: 4px; padding: 3px 0; font-size: 13px; }
          .ab-cat-list li span { flex: 1; }
          .ab-table-filter {
            flex: 0 1 180px;
            min-width: 90px;
            padding: 4px 8px;
            font-size: 12px;
            font-weight: 400;
            border: 1px solid var(--border-color, #d1d5db);
            border-radius: 6px;
            background: var(--bg-panel, #fff);
            color: inherit;
          }

          /* Dark theme. BallooningWidgetCss is a verbatim copy of the DS_ERP
             file and defines its palette on :root, so rather than editing it we
             redefine those same ten tokens on the theme root, which every rule
             inside the widget resolves against.

             Keyed on the theme class, not on data-bs-theme: this app switches
             themes with theme-azure-light / theme-glassy-light /
             theme-cosmos-dark on <html>, and data-bs-theme is never flipped, so
             a block keyed on it simply never applied. [class*="-dark"] matches
             any dark pro theme rather than cosmos specifically.

             Declared on the root and not on .ab-app-container because
             attachPanels() relocates the table and property editor into the
             workspace tray, outside this widget's DOM; a token block scoped to
             the container would not follow them. The copied CSS declares these
             on :root too, which has equal specificity — this block wins by
             coming later in the document.

             Surfaces are mixed from the body colour rather than taken from
             --bs-tertiary-bg / --bs-secondary-bg: those two are NOT redefined by
             theme-cosmos-dark and still resolve to Bootstrap's light greys,
             which would put light panels behind light text. */
          :root[class*="-dark"] {
            --primary-color: var(--bs-link-color, #6ea8fe);
            --primary-hover: var(--bs-link-hover-color, #8bb9fe);
            --danger-color:  #f1707b;
            --danger-bg:     rgba(220, 53, 69, .16);
            --danger-border: rgba(220, 53, 69, .40);
            --text-main:     var(--bs-body-color, #dee2e6);
            --text-muted:    color-mix(in srgb, var(--bs-body-color, #dee2e6) 65%, transparent);
            --bg-main:       var(--bs-body-bg, #212529);
            --bg-panel:      color-mix(in srgb, var(--bs-body-color, #dee2e6) 8%, var(--bs-body-bg, #212529));
            --border-color:  var(--bs-border-color, #495057);
          }
          /* Text colour is set on the widget and on the relocated panels rather
             than on the theme root, which would repaint the whole page. */
          :root[class*="-dark"] .ab-app-container,
          :root[class*="-dark"] .ab-table-container,
          :root[class*="-dark"] .ab-property-editor {
            color: var(--bs-body-color, #dee2e6);
          }
          /* ── the Settings dropdown ─────────────────────────────────────
             One Supply's 功能 menu, which lives in a menu bar. This widget
             sits inside a page and has none, so it hangs off a toolbar
             button instead. */
          /* ── the sheet's grid ──────────────────────────────────────────
             Drawn in page percentages like every other overlay, so it stays
             on the frame at any zoom. */
          .ab-grid-layer { position: absolute; inset: 0; pointer-events: none; }
          /* Above the balloons (10) and a selected one (20). The layer itself
             still takes no pointer events, so only the lines are grabbable. */
          .ab-grid-layer.adjusting { z-index: 30; }
          .ab-grid-line { position: absolute; background: #2563eb; opacity: .45; }
          .ab-grid-line.v { top: 0; bottom: 0; width: 1px; }
          .ab-grid-line.h { left: 0; right: 0; height: 1px; }
          .ab-grid-line.edge { opacity: .75; }
          /* Only the inner lines take the pointer, and they are given a fat
             invisible grab area - a 1px line is not a target anyone can hit. */
          .ab-grid-line.adjustable[data-grid-axis] {
            pointer-events: auto; opacity: .8;
          }
          .ab-grid-line.adjustable.v[data-grid-axis] {
            width: 9px; margin-left: -4px; cursor: ew-resize;
            background: linear-gradient(to right, transparent 4px, #2563eb 4px, #2563eb 5px, transparent 5px);
          }
          .ab-grid-line.adjustable.h[data-grid-axis] {
            height: 9px; margin-top: -4px; cursor: ns-resize;
            background: linear-gradient(to bottom, transparent 4px, #2563eb 4px, #2563eb 5px, transparent 5px);
          }
          .ab-grid-line.adjustable[data-grid-axis]:hover { opacity: 1; }
          .ab-grid-cell {
            position: absolute; transform: translate(-50%, -50%);
            font-size: 10px; font-weight: 600; color: #2563eb; opacity: .55;
            pointer-events: none; white-space: nowrap;
          }

          .ab-menu-wrap { display: inline-flex; }
          .ab-caret { font-size: 10px; opacity: .7; margin-left: 2px; }
          /* position:FIXED, and appended to the container rather than the
             toolbar. .ab-toolbar is height:64px with overflow-x:auto, which
             makes it a scroll container in both axes - an absolutely
             positioned menu inside it was clipped to that 64px strip and put
             the toolbar itself on a scrollbar. Fixed takes it out of every
             ancestor's overflow; openSettingsMenu places it from the button's
             rect and flips it above when there is no room below. */
          .ab-menu {
            position: fixed; z-index: 1060;
            width: 264px; padding: 4px 0;
            max-height: min(70vh, 460px); overflow-y: auto;
            background: var(--bs-body-bg, #fff);
            border: 1px solid var(--bs-border-color, #d0d0d0);
            border-radius: 6px; box-shadow: 0 8px 24px rgba(0,0,0,.18);
          }
          .ab-menu-item {
            display: flex; align-items: center; gap: 8px; width: 100%;
            padding: 7px 12px; border: 0; background: none; text-align: left;
            font: inherit; font-size: 12px; line-height: 1.3; color: inherit;
            cursor: pointer; white-space: normal;
          }
          /* A short muted tag instead of appending "administrators only" to
             the label, which doubled the width of two rows. */
          .ab-menu-tag {
            margin-left: auto; padding-left: 8px; font-size: 10px;
            text-transform: uppercase; letter-spacing: .03em; opacity: .55;
          }
          .ab-menu-item:hover { background: rgba(0,0,0,.06); }
          .ab-menu-item input { margin: 2px 0 0 0; flex: none; }
          .ab-menu-disabled, .ab-menu-item:disabled {
            opacity: .55; cursor: default;
          }
          .ab-menu-disabled:hover, .ab-menu-item:disabled:hover { background: none; }
          /* 1px separators between groups, as in the original's addSeparator(). */
          .ab-menu-sep {
            height: 1px; margin: 4px 6px;
            background: var(--bs-border-color, #d0d0d0);
          }
          :root[class*="-dark"] .ab-menu-item:hover { background: rgba(255,255,255,.08); }

          /* The drawing itself stays on white — a scanned sheet inverted is
             unreadable — but the surround follows the theme. */
          :root[class*="-dark"] .ab-viewport { background-color: var(--bs-body-bg, #212529); }
          :root[class*="-dark"] .ab-toolbar,
          :root[class*="-dark"] .ab-btn {
            background-color: var(--bg-panel);
            color: var(--bs-body-color, #dee2e6);
            border-color: var(--bs-border-color, #495057);
          }
          /* These four carry hardcoded light backgrounds rather than tokens, so
             retinting the palette alone left light strips under light text. */
          :root[class*="-dark"] .ab-table-header,
          :root[class*="-dark"] .ab-panel-header,
          :root[class*="-dark"] .ab-table th {
            background-color: color-mix(in srgb, var(--bs-body-color, #dee2e6) 14%, var(--bs-body-bg, #212529));
            border-color: var(--bs-border-color, #495057);
          }
          :root[class*="-dark"] .ab-table td {
            border-bottom-color: var(--bs-border-color, #495057);
          }
          :root[class*="-dark"] .ab-table tbody tr:hover {
            background-color: color-mix(in srgb, var(--bs-body-color, #dee2e6) 14%, var(--bs-body-bg, #212529));
          }
          :root[class*="-dark"] .ab-empty-state {
            color: color-mix(in srgb, var(--bs-body-color, #dee2e6) 65%, transparent);
          }

          :root[class*="-dark"] .ab-input,
          :root[class*="-dark"] .ab-textarea,
          :root[class*="-dark"] .ab-select {
            background-color: var(--bs-body-bg, #212529);
            color: var(--bs-body-color, #dee2e6);
            border-color: var(--bs-border-color, #495057);
          }
        </style>
        <div class="ab-app-container">
          <div id="ab-pagebar" class="ab-pagebar"></div>
          <div id="ab-toolbar" class="ab-toolbar"></div>
          <div class="ab-workspace">
            <div id="ab-viewport" class="ab-viewport">
              <div id="ab-canvas-container" class="ab-canvas-container">
                 <img id="ab-image" class="ab-image" draggable="false" alt="" />
                 <div id="ab-overlays" style="position:absolute;inset:0;"></div>
              </div>
              <div id="ab-empty-state" class="ab-empty-state hidden">
                  <p style="margin-bottom: 8px;">No drawing loaded</p>
                  <p style="font-size: 14px;">Select a 2D document in the rail to balloon it.</p>
              </div>
            </div>
            <div id="ab-sidebar" style="display:flex;flex-direction:column;height:100%;min-width:0;">
              <div id="ab-property-editor" class="ab-property-editor"></div>
              <div id="ab-table" class="ab-table-container"></div>
            </div>
          </div>
        </div>`;

        this.toolbarEl = this.container.querySelector('#ab-toolbar')!;
        this.pagebarEl = this.container.querySelector('#ab-pagebar')!;
        this.viewportEl = this.container.querySelector('#ab-viewport')!;
        this.canvasContainerEl = this.container.querySelector('#ab-canvas-container')!;
        this.propertyEditorEl = this.container.querySelector('#ab-property-editor')!;
        this.tableEl = this.container.querySelector('#ab-table')!;
        this.sidebarEl = this.container.querySelector('#ab-sidebar')!;
    }

    private bindGlobalEvents() {
        this.viewportEl.addEventListener('mousedown', e => this.handleMouseDown(e));
        window.addEventListener('mousemove', e => this.handleMouseMove(e));
        window.addEventListener('mouseup', e => this.handleMouseUp(e));
        this.viewportEl.addEventListener('wheel', e => this.handleWheel(e), {passive: false});

        // Right-clicking an area opens its menu; right-clicking anywhere else
        // inside the drawing keeps the browser menu suppressed but closes ours,
        // so it cannot be left orphaned over the canvas.
        this.viewportEl.addEventListener('contextmenu', e => {
            e.preventDefault();
            // The right button also pans; a drag is not a request for a menu.
            if (this.rightPanMoved) { this.rightPanMoved = false; return; }
            const t = e.target as HTMLElement;
            const balloon = (t.closest('.balloon-handle') || t.closest('.ab-annotation-box')) as HTMLElement | null;
            if (balloon) {
                this.closeRegionMenu();
                this.openBalloonContextMenu(balloon.getAttribute('data-id')!, e.clientX, e.clientY);
                return;
            }
            const regionEl = t.closest('.ab-region');
            if (!regionEl) { this.closeRegionMenu(); return; }
            this.showRegionMenu(
                regionEl.getAttribute('data-region-id')!, e.clientX, e.clientY);
        });
        // Any click elsewhere dismisses it. Capture phase, so it runs before
        // the canvas handler that would re-render and orphan the node.
        window.addEventListener('mousedown', e => {
            if (this.regionMenuEl &&
                !this.regionMenuEl.contains(e.target as Node)) this.closeRegionMenu();
        }, true);
        window.addEventListener('keydown', e => {
            if (e.key !== 'Escape') return;
            this.closeRegionMenu();
            this.closeGdtPalette();
        });
        // Clicking away from both the palette and the field it feeds closes it.
        // The palette itself is excluded, or every symbol click would shut it.
        window.addEventListener('mousedown', e => {
            if (!this.gdtPaletteEl) return;
            const t = e.target as Node;
            if (this.gdtPaletteEl.contains(t)) return;
            if ((t as HTMLElement)?.closest?.('#ab-content')) return;
            this.closeGdtPalette();
        }, true);

        // Shortcuts: undo, redo, delete. Never while typing - a text field has
        // its own undo - and never while another workspace mode is showing,
        // where Delete used to remove balloons nobody could see.
        window.addEventListener('keydown', e => {
            const t = e.target as HTMLElement;
            const typing = !!t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
            if (typing || !this.isOnScreen()) return;

            const mod = e.ctrlKey || e.metaKey;
            const key = e.key.toLowerCase();
            if (mod && key === 'z' && !e.shiftKey) { e.preventDefault(); this.undo(); return; }
            if (mod && (key === 'y' || (key === 'z' && e.shiftKey))) { e.preventDefault(); this.redo(); return; }

            // One Supply's shortcuts.
            if (e.key === 'F2') { e.preventDefault(); this.auditAndNext(); return; }
            if (e.key === 'Escape') {
                if (this.pickParentFor) { this.cancelPickParent(); return; }
                if (this.toolMode !== 'select') { this.setTool('select'); return; }
            }
            if (!mod && !e.altKey) {
                const tool = (m: ToolMode) => { e.preventDefault(); this.setTool(this.toolMode === m ? 'select' : m); };
                if (key === 'w') return tool('area_ocr');
                if (key === 'q') return tool('single_ocr');
                if (key === 'm') return tool('mask_area');
                if (key === 'g') {
                    e.preventDefault();
                    this.showGrid = !(this.showGrid || this.adjustGrid);
                    if (!this.showGrid) this.adjustGrid = false;
                    this.renderToolbar();
                    this.renderCanvas();
                    return;
                }
                if (key === 'r') { e.preventDefault(); this.rotatePage(90); return; }
                if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); this.setPage(this.currentPage - 1); return; }
                if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); this.setPage(this.currentPage + 1); return; }
            }

            if (e.key !== 'Delete' && e.key !== 'Backspace') return;
            if (!this.selectedId && !this.selectedIds.size) return;
            e.preventDefault();
            this.deleteSelected();
        });

        // Closing or leaving the page with edits only in memory would lose
        // them without a word. The browser shows its own wording.
        this.beforeUnloadHandler = (e: BeforeUnloadEvent) => {
            if (!this.dirty) return;
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', this.beforeUnloadHandler);
    }

    private renderAll() {
        this.renderToolbar();
        this.renderCanvas();
        this.renderProperties();
        this.renderTable();
    }

    // ─── Toolbar ─────────────────────────────────────────────────────────

    /**
     * The Settings dropdown - One Supply's `功能` (Functions) menu.
     *
     * Same shape as the original: checkable items for the switches, then "..."
     * items that open a dialog, separated into groups. The order follows it too,
     * skipping the entries DSRFQ has no equivalent for (single-OCR screenshot,
     * show-arrow, thicken-lines, the symbol filter).
     *
     * Everything here is shop-wide, which is why it is one menu rather than
     * controls scattered through the panels: a setting that applies to every
     * drawing should not be reached by first selecting a balloon on this one.
     */
    /** Hook up the Settings dropdown, and let a click outside dismiss it. */
    private wireSettingsMenu(): void {
        const menu = this.settingsMenuEl;
        if (!menu) return;

        const q = <T extends HTMLElement>(sel: string) => menu.querySelector(sel) as T;
        const closeMenu = () => this.closeSettingsMenu();

        // The three structural filters. Written straight through, like the
        // checkable items in the original: the menu IS the setting, there is no
        // separate Apply.
        const filterToggle = (sel: string, key: 'englishNoise' | 'reference' | 'datum' | 'basic') =>
            q<HTMLInputElement>(sel)?.addEventListener('change', e => {
                const next = {...loadDimensionFilters()};
                next[key] = (e.target as HTMLInputElement).checked;
                saveDimensionFilters(next);
                this.renderAll();
            });
        filterToggle('#ab-m-eng', 'englishNoise');
        filterToggle('#ab-m-ref', 'reference');
        filterToggle('#ab-m-datum-filter', 'datum');
        filterToggle('#ab-m-basic', 'basic');

        q<HTMLInputElement>('#ab-m-datum-gen')?.addEventListener('change', async e => {
            const el = e.target as HTMLInputElement;
            const next = {...getDatumSettings(), addMissing: el.checked};
            try {
                await saveDatumSettings(next);
                notifySuccess('Saved for the shop. It applies the next time a '
                    + 'drawing is ballooned - it does not change this one.');
            } catch (err: any) {
                el.checked = !el.checked;   // it did not take; do not pretend
                notifyError('Could not save: ' + (err?.message ?? err));
            }
        });

        q('#ab-m-keywords')?.addEventListener('click', () => {
            closeMenu();
            this.openKeywordFilterDialog();
        });
        q('#ab-m-sep')?.addEventListener('click', () => {
            closeMenu();
            this.openSeparatorDialog();
        });
        q('#ab-m-datum')?.addEventListener('click', () => {
            closeMenu();
            this.openDatumSettingsDialog();
        });

        const defaultToggle = (sel: string, key: 'gdtGroupSort' | 'skipDonePages' | 'singleAsScreenshot') =>
            q<HTMLInputElement>(sel)?.addEventListener('change', e => {
                this.editorDefaults = {...this.editorDefaults, [key]: (e.target as HTMLInputElement).checked};
                saveEditorDefaults(this.editorDefaults);
            });
        defaultToggle('#ab-m-gdt', 'gdtGroupSort');
        defaultToggle('#ab-m-skipdone', 'skipDonePages');
        defaultToggle('#ab-m-shot', 'singleAsScreenshot');
        q<HTMLInputElement>('#ab-m-pdfask')?.addEventListener('change', e =>
            savePdfExportOptions({...loadPdfExportOptions(), askBeforeExport: (e.target as HTMLInputElement).checked}));
        q('#ab-m-bubble')?.addEventListener('click', () => { closeMenu(); this.openBubbleSettings(); });
        q('#ab-m-cat')?.addEventListener('click', () => { closeMenu(); this.openCategoryOrder(); });
        q('#ab-m-symbols')?.addEventListener('click', () => { closeMenu(); this.openSymbolFilter(); });
        q('#ab-m-tool')?.addEventListener('click', () => { closeMenu(); this.openDefaultTool(); });

        // Dismiss on a click anywhere outside the menu or its button.
        //
        // On `document`, not on this.container: the balloon table is not inside
        // the widget's own container at all - it is rendered into the
        // workspace's .cw-rail-balloon, and their nearest common ancestor is
        // .cw-body. A listener scoped to the container never saw a click on a
        // table row, so the menu hung open over the list.
        //
        // Explicitly added and removed rather than {once: true}: a click INSIDE
        // the menu (ticking one of the switches) would consume a once-listener
        // and leave the menu with nothing left to dismiss it. Removed in
        // closeSettingsMenu and in destroy(), so at most one is ever attached.
        this.detachSettingsAway();
        setTimeout(() => {
            if (!this.settingsMenuOpen) return;
            this.settingsAwayHandler = (ev: Event) => {
                // Scroll and resize move the button out from under a fixed
                // menu, so they dismiss rather than leaving it stranded.
                if (ev.type !== 'click') { closeMenu(); return; }
                const t = (ev as MouseEvent).target as HTMLElement;
                if (!t?.closest?.('.ab-menu') && !t?.closest?.('.ab-menu-wrap'))
                    closeMenu();
            };
            document.addEventListener('click', this.settingsAwayHandler);
            // Capture, so a scroll in any pane counts - scroll does not bubble.
            document.addEventListener('scroll', this.settingsAwayHandler, true);
            window.addEventListener('resize', this.settingsAwayHandler);
        }, 0);

        menu.addEventListener('keydown', e => {
            if ((e as KeyboardEvent).key === 'Escape') closeMenu();
        });
    }

    private detachSettingsAway(): void {
        if (!this.settingsAwayHandler) return;
        document.removeEventListener('click', this.settingsAwayHandler);
        document.removeEventListener('scroll', this.settingsAwayHandler, true);
        window.removeEventListener('resize', this.settingsAwayHandler);
        this.settingsAwayHandler = null;
    }

    /**
     * One Supply's `间隔序号分隔符...`, and free text as it is there.
     *
     * It can be free text because parseBalloonNumber reads the separator
     * structurally rather than from a list, so anything typed here round-trips
     * through BalloonNo and drawings written under the previous mark keep
     * loading. Only three things are refused - see isValidSubSeparator.
     */
    private openSeparatorDialog(): void {
        const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g,
            c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]!));
        const current = loadSubSeparator();

        const overlay = document.createElement('div');
        overlay.className = 'ab-modal-overlay';
        overlay.innerHTML = `
          <div class="ab-modal" role="dialog" aria-label="Interval number separator" style="width:440px;">
            <div class="ab-modal-header">Interval number separator</div>
            <div class="ab-modal-body">
              <p class="ab-modal-note">What separates a child balloon's number from
                 its parent. A house convention, applied to every drawing.</p>
              <div class="ab-form-group">
                <label class="ab-label" for="ab-sep-pick">Separator</label>
                <input id="ab-sep-pick" class="ab-input" style="width:120px;"
                       maxlength="${MAX_SUB_SEPARATOR_LENGTH}" value="${esc(current)}"
                       placeholder="${esc(DEFAULT_SUB_SEPARATOR)}" />
                <p class="ab-modal-note" id="ab-sep-preview"></p>
              </div>
              <p class="ab-modal-note">Common choices are
                 ${SUB_SEPARATORS.map(s => `<code>${esc(s)}</code>`).join(', ')} &mdash;
                 but anything up to ${MAX_SUB_SEPARATOR_LENGTH} characters works.
                 Not a digit, a space, or <code>_</code>: a digit would merge with
                 the numbers either side, and <code>_</code> already means a
                 repeated instance, so <code>5_1</code> would be ambiguous.</p>
            </div>
            <div class="ab-modal-footer">
              <span style="flex:1;"></span>
              <button id="ab-modal-cancel" class="ab-btn">Cancel</button>
              <button id="ab-modal-ok" class="ab-btn ab-btn-primary">Apply</button>
            </div>
          </div>`;

        const input = overlay.querySelector('#ab-sep-pick') as HTMLInputElement;
        const preview = overlay.querySelector('#ab-sep-preview') as HTMLElement;
        const ok = overlay.querySelector('#ab-modal-ok') as HTMLButtonElement;

        // Shown rather than explained: the point of the setting is what a
        // child balloon ends up looking like.
        const refresh = () => {
            const v = input.value;
            const valid = isValidSubSeparator(v);
            ok.disabled = !valid;
            preview.textContent = valid
                ? `A child of balloon 5 reads ${formatBalloonNumber(
                    {balloonNumber: 5, subNumber: 1}, v)}`
                : (v ? 'Not usable: no digits, spaces or underscores.'
                     : 'Type a separator.');
        };
        input.addEventListener('input', refresh);
        refresh();

        const close = () => overlay.remove();
        overlay.querySelector('#ab-modal-cancel')?.addEventListener('click', close);
        ok.addEventListener('click', () => {
            if (!isValidSubSeparator(input.value)) return;
            this.subSeparator = input.value;
            saveSubSeparator(this.subSeparator);
            // Presentation only: BalloonNo is rewritten on the next save, and
            // parseBalloonNumber reads whatever separator it finds, so an
            // existing drawing keeps loading either way.
            this.dirty = true;
            close();
            this.renderAll();
        });
        this.container.appendChild(overlay);
    }

    /**
     * The datum switches the RFQ consumer reads.
     *
     * There is deliberately no "use geometry" switch. The OpenCV pass runs in
     * the middleware on every ballooning upload whatever this says, so turning
     * it off here would not have saved the work - it would only have thrown the
     * result away and fallen back to searching the OCR text for a ▲, which
     * cannot tell a datum from a control frame citing one. Same cost, worse
     * answer, so it was not a choice worth offering.
     */
    private openDatumSettingsDialog(): void {
        const s = getDatumSettings();
        const overlay = document.createElement('div');
        overlay.className = 'ab-modal-overlay';
        overlay.innerHTML = `
          <div class="ab-modal" role="dialog" aria-label="Datum detection" style="width:560px;">
            <div class="ab-modal-header">Datum detection</div>
            <div class="ab-modal-body">
              <p class="ab-modal-note">A datum feature is the ▲ marking a surface AS
                 the reference everything else is measured from — not the "A B C"
                 inside a control frame citing one. Every drawing is scanned for
                 them automatically, by shape: a filled triangle joined by a leader
                 to a boxed capital. There is nothing to switch on — that scan is
                 how datums are found, and it runs on every page.</p>
              <p class="ab-modal-note">What is left to decide is what happens to the
                 ones it finds where recognition read no text at all.</p>
              <div class="ab-form-group">
                <label class="ab-label ab-check">
                  <input id="ab-d-add" type="checkbox" ${s.addMissing ? 'checked' : ''} />
                  Balloon the datums recognition missed</label>
                <p class="ab-modal-note">On, they become balloons of their own. Off,
                   only datums that already have a balloon are marked as such, and
                   the rest are left off the inspection report.</p>
              </div>
              <div class="ab-form-group">
                <label class="ab-label" for="ab-d-conf">Minimum confidence to add</label>
                <input id="ab-d-conf" class="ab-input" type="number" min="0" max="1"
                       step="0.05" style="width:120px;" value="${s.addMinConfidence}" />
                <p class="ab-modal-note">Applies to added balloons only, on top of the
                   detector's own threshold of 0.5. Leave at 0 to accept whatever it
                   accepted; 0.8 adds only datums that had both a traced leader and a
                   readable letter.</p>
              </div>
              <p class="ab-modal-note">Read when a drawing is ballooned, so a change
                 takes effect on the next run rather than on the balloons already here.</p>
            </div>
            <div class="ab-modal-footer">
              <span style="flex:1;"></span>
              <button id="ab-modal-cancel" class="ab-btn">Cancel</button>
              <button id="ab-modal-ok" class="ab-btn ab-btn-primary">Save</button>
            </div>
          </div>`;

        const close = () => overlay.remove();
        overlay.querySelector('#ab-modal-cancel')?.addEventListener('click', close);
        overlay.querySelector('#ab-modal-ok')?.addEventListener('click', async () => {
            const conf = Number((overlay.querySelector('#ab-d-conf') as HTMLInputElement).value);
            if (!Number.isFinite(conf) || conf < 0 || conf > 1) {
                notifyError('Minimum confidence is a fraction between 0 and 1.');
                return;
            }
            try {
                await saveDatumSettings({
                    addMissing: (overlay.querySelector('#ab-d-add') as HTMLInputElement).checked,
                    addMinConfidence: conf,
                });
                close();
                notifySuccess('Saved. It applies the next time a drawing is ballooned.');
            } catch (e: any) {
                notifyError('Could not save: ' + (e?.message ?? e));
            }
        });
        this.container.appendChild(overlay);
    }

    // ─── The sheet's grid ────────────────────────────────────────────────

    /**
     * The grid this page declares, or null when it declares none.
     *
     * Read off the balloons, which all carry the same GridStart/GridEnd for
     * their sheet. A drawing with no printed frame has neither, and every grid
     * control below is hidden rather than shown doing nothing.
     */
    private pageGridExtent() {
        const on = this.annotations.find(
            a => a.pageIndex === this.currentPage && a.gridStart && a.gridEnd);
        return on ? parseGridExtent(on.gridStart, on.gridEnd) : null;
    }

    /**
     * This page's lines: the stored correction, or equal spacing if nobody has
     * adjusted it.
     *
     * A stored profile that no longer matches the sheet's extent is discarded
     * rather than drawn - that happens when recognition re-reads the frame as
     * a different size, and a grid with the wrong number of lines would put
     * every balloon in the wrong cell.
     */
    private currentGridProfile(): GridProfile | null {
        const extent = this.pageGridExtent();
        if (!extent) return null;

        if (this.gridProfile && isProfileValidFor(this.gridProfile, extent))
            return this.gridProfile;

        const stored = this.gridByPage.get(this.currentPage + 1);
        if (stored && isProfileValidFor(stored.profile, extent)) {
            this.gridProfile = stored.profile;
            this.gridRowId = stored.id;
            return this.gridProfile;
        }

        // Equal spacing - across the drawing border when one has been selected.
        this.gridProfile = buildEqualProfile(extent,
            this.pageFrame.get(this.currentPage) ?? {x: 0, y: 0, width: 100, height: 100});
        this.gridRowId = stored ? stored.id : (this.gridRowIds.get(this.currentPage + 1) ?? null);
        return this.gridProfile;
    }

    /** The grid overlay: lines, and drag handles while adjusting. */
    private renderGridOverlay(): string {
        if (!this.showGrid && !this.adjustGrid) return '';
        const extent = this.pageGridExtent();
        const profile = this.currentGridProfile();
        if (!extent || !profile) return '';

        const cls = this.adjustGrid ? 'ab-grid-line adjustable' : 'ab-grid-line';
        // Under everything while it is only being shown - it is the sheet's
        // own frame, and the balloons are what sit on it. Over everything
        // while it is being adjusted: the layer is painted first, so without
        // this a page's balloons cover the lines and swallow the drag.
        let html = `<div class="ab-grid-layer${this.adjustGrid ? ' adjusting' : ''}">`;

        // The outer borders are drawn but not draggable: moving one changes
        // what the grid covers rather than where a line inside it sits, and an
        // operator reaching for the first inner line would catch the border
        // instead.
        profile.xLines.forEach((x, i) => {
            const edge = i === 0 || i === profile.xLines.length - 1;
            html += `<div class="${cls} v ${edge ? 'edge' : ''}" style="left:${x}%;"
                          ${this.adjustGrid && !edge ? `data-grid-axis="x" data-grid-index="${i}"` : ''}></div>`;
        });
        profile.yLines.forEach((y, i) => {
            const edge = i === 0 || i === profile.yLines.length - 1;
            html += `<div class="${cls} h ${edge ? 'edge' : ''}" style="top:${y}%;"
                          ${this.adjustGrid && !edge ? `data-grid-axis="y" data-grid-index="${i}"` : ''}></div>`;
        });

        // The cell labels, so an operator can see at a glance whether the grid
        // is aligned with the frame printed on the sheet - which is the whole
        // point of drawing it.
        for (let xi = 0; xi < profile.xLines.length - 1; xi++) {
            for (let yi = 0; yi < profile.yLines.length - 1; yi++) {
                const cx = (profile.xLines[xi] + profile.xLines[xi + 1]) / 2;
                const cy = (profile.yLines[yi] + profile.yLines[yi + 1]) / 2;
                const cell = belongFromProfile(cx, cy, extent, profile);
                html += `<div class="ab-grid-cell" style="left:${cx}%;top:${cy}%;">${cell}</div>`;
            }
        }
        return html + '</div>';
    }

    /** Make the inner lines draggable. Called after the overlay is written. */
    private wireGridHandles(): void {
        if (!this.adjustGrid) return;
        const layer = this.container.querySelector('.ab-grid-layer');
        if (!layer) return;

        layer.querySelectorAll('[data-grid-axis]').forEach(el => {
            el.addEventListener('pointerdown', (raw: Event) => {
                const e = raw as PointerEvent;
                // Kept off the canvas's own pointer pipeline entirely: the
                // drawing tools own that, and a grid drag is not a tool mode.
                e.preventDefault();
                e.stopPropagation();
                const axis = (el as HTMLElement).dataset.gridAxis as 'x' | 'y';
                const index = Number((el as HTMLElement).dataset.gridIndex);

                const move = (ev: PointerEvent) => {
                    const p = this.getRelativeCoords(ev as unknown as MouseEvent);
                    const profile = this.currentGridProfile();
                    if (!profile) return;
                    this.gridProfile = moveLine(
                        profile, axis, index, axis === 'x' ? p.x : p.y);
                    this.renderCanvas();
                };
                const up = () => {
                    document.removeEventListener('pointermove', move);
                    document.removeEventListener('pointerup', up);
                };
                document.addEventListener('pointermove', move);
                document.addEventListener('pointerup', up);
            });
        });
    }

    /**
     * Save the adjusted lines, and optionally re-file the balloons under them.
     *
     * One Supply's `ask_grid_adjustment_apply_options`: save and recompute,
     * save only, or cancel, with a checkbox for every page. Recomputing is the
     * point - the lines are only worth moving because the cells they imply are
     * wrong - but "save only" exists because an operator part-way through
     * aligning a sheet should be able to keep their work without re-filing
     * every balloon against a grid they have not finished.
     */
    private async applyGridAdjustment(): Promise<void> {
        const extent = this.pageGridExtent();
        const profile = this.currentGridProfile();
        if (!extent || !profile) return;

        const choice = await this.askGridApply();
        if (choice === 'cancel') return;

        // Every page of the drawing, as One Supply does - not only the pages
        // that happen to hold balloons yet, which left a page recognised later
        // on the old lines.
        const pages = choice.allPages
            ? [...new Set([...this.pages.map((_, i) => i), ...this.annotations.map(a => a.pageIndex)])]
            : [this.currentPage];

        let saved = 0;
        for (const page of pages) {
            const stored = this.gridByPage.get(page + 1);
            try {
                const id = await saveGridProfile(
                    this.costingPartId, page + 1, profile,
                    (page === this.currentPage ? this.gridRowId : (stored?.id ?? null))
                        ?? this.gridRowIds.get(page + 1) ?? null);
                this.gridByPage.set(page + 1, {id, profile});
                if (id) this.gridRowIds.set(page + 1, id);
                if (page === this.currentPage) this.gridRowId = id;
                saved++;
            } catch (e: any) {
                notifyError(`Could not save the grid for page ${page + 1}: `
                    + (e?.message ?? e));
                return;
            }
        }

        let refiled = 0;
        if (choice.recompute) {
            for (const page of pages) {
                // Each page is filed against ITS own extent. Copying one
                // page's lines to a sheet with a different frame would be
                // meaningless, and belongFromProfile refuses it rather than
                // inventing a cell.
                const pageExtent = (() => {
                    const on = this.annotations.find(
                        a => a.pageIndex === page && a.gridStart && a.gridEnd);
                    return on ? parseGridExtent(on.gridStart, on.gridEnd) : null;
                })();
                if (!pageExtent || !isProfileValidFor(profile, pageExtent)) continue;

                for (const a of this.annotations) {
                    if (a.pageIndex !== page) continue;
                    const cx = a.rect.x + a.rect.width / 2;
                    const cy = a.rect.y + a.rect.height / 2;
                    const cell = belongFromProfile(cx, cy, pageExtent, profile);
                    if (cell !== a.section) { a.section = cell; refiled++; }
                }
            }
            if (refiled) this.dirty = true;
        }

        this.renderAll();
        notifySuccess(
            `Grid saved for ${saved} page${saved === 1 ? '' : 's'}`
            + (choice.recompute
                ? `; ${refiled} balloon${refiled === 1 ? '' : 's'} re-filed.`
                  + (refiled ? ' Save to keep it.' : '')
                : '.'));
    }

    /** The three-way apply prompt, with its all-pages checkbox. */
    private askGridApply(): Promise<'cancel' | {recompute: boolean; allPages: boolean}> {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'ab-modal-overlay';
            overlay.innerHTML = `
              <div class="ab-modal" role="dialog" aria-label="Apply grid adjustment" style="width:480px;">
                <div class="ab-modal-header">Apply grid adjustment</div>
                <div class="ab-modal-body">
                  <p class="ab-modal-note">Save these grid lines, and re-file every
                     balloon into the cell it now falls in?</p>
                  <div class="ab-form-group">
                    <label class="ab-label ab-check">
                      <input id="ab-grid-all" type="checkbox" />
                      Apply to every page of this drawing</label>
                    <p class="ab-modal-note">Off, only this page changes. A page whose
                       frame is a different size is skipped rather than filed against
                       the wrong grid.</p>
                  </div>
                </div>
                <div class="ab-modal-footer">
                  <button id="ab-grid-cancel" class="ab-btn">Cancel</button>
                  <span style="flex:1;"></span>
                  <button id="ab-grid-save" class="ab-btn">Save only</button>
                  <button id="ab-grid-apply" class="ab-btn ab-btn-primary">Save &amp; re-file</button>
                </div>
              </div>`;

            const all = () => (overlay.querySelector('#ab-grid-all') as HTMLInputElement).checked;
            const done = (v: 'cancel' | {recompute: boolean; allPages: boolean}) => {
                overlay.remove();
                resolve(v);
            };
            overlay.querySelector('#ab-grid-cancel')?.addEventListener('click', () => done('cancel'));
            overlay.querySelector('#ab-grid-save')?.addEventListener('click',
                () => done({recompute: false, allPages: all()}));
            overlay.querySelector('#ab-grid-apply')?.addEventListener('click',
                () => done({recompute: true, allPages: all()}));
            this.container.appendChild(overlay);
        });
    }

    private renderSettingsMenu(): string {
        const filters = loadDimensionFilters();
        const datum = getDatumSettings();
        const admin = canEditShopSettings();
        // An operator may look but not change. Better than a control that
        // appears editable and is refused by the server on save.
        const adminOnly = admin ? '' : 'disabled';
        const tag = admin ? '' : '<span class="ab-menu-tag">admin</span>';

        const check = (id: string, on: boolean, label: string, hint: string,
                       disabled = '', suffix = '') => `
          <label class="ab-menu-item ${disabled ? 'ab-menu-disabled' : ''}" title="${hint}">
            <input id="${id}" type="checkbox" ${on ? 'checked' : ''} ${disabled} />
            <span>${label}</span>${suffix}
          </label>`;

        return `
          ${check('ab-m-datum-gen', datum.addMissing, 'Generate datum annotations',
                  'Balloon the datum features found in the drawing by geometry, '
                  + 'including the ones recognition missed. Off leaves them out '
                  + 'of the balloon list entirely.', adminOnly, tag)}
          ${check('ab-m-eng', filters.englishNoise, 'Filter English noise',
                  'Prose OCR scraped off the sheet. THRU, TYP and thread '
                  + 'callouts are kept.')}
          ${check('ab-m-ref', filters.reference, 'Filter reference dimensions',
                  'A value wholly in brackets, (1.250). Derived from other '
                  + 'dimensions and not inspected. Also applies when a drawing '
                  + 'is ballooned.')}
          ${check('ab-m-basic', filters.basic, 'Filter basic (boxed) dimensions',
                  'A value drawn in a box, or read as [1.250]. Theoretically '
                  + 'exact, so not inspected on its own. Applies when a drawing '
                  + 'is ballooned; a boxed frame with a GD&T symbol is kept.')}
          ${check('ab-m-datum-filter', filters.datum, 'Filter datum features',
                  'Remove the ▲ balloons from the list. A control frame '
                  + 'that cites datums A B C is kept.')}
          <button class="ab-menu-item" id="ab-m-keywords" role="menuitem"
            title="Phrases that are never a characteristic - view labels, TYP, FOR REFERENCE ONLY.">
            Always-filter keywords&hellip;</button>

          <div class="ab-menu-sep"></div>

          <button class="ab-menu-item" id="ab-m-sep" role="menuitem"
            title="What separates a child number from its parent: 5-1, 5.1 or 5/1.">
            Interval number separator&hellip;</button>
          <button class="ab-menu-item" id="ab-m-datum" role="menuitem" ${adminOnly}
            title="How datum features are found in the drawing.">
            Datum detection&hellip;${tag}</button>

          <div class="ab-menu-sep"></div>

          ${check('ab-m-gdt', this.editorDefaults.gdtGroupSort, 'GD&amp;T group continuous sorting',
                  'Renumber puts a feature control frame straight after the dimension it sits against.', adminOnly, tag)}
          ${check('ab-m-skipdone', this.editorDefaults.skipDonePages, 'Auto Balloon skips pages already done',
                  'Auto Balloon (all) only runs pages that have no balloons yet, leaving the rest exactly as they are.', adminOnly, tag)}
          ${check('ab-m-shot', this.editorDefaults.singleAsScreenshot, 'Single recognition as screenshot',
                  'Single Read keeps a picture of the box instead of reading its text.', adminOnly, tag)}
          ${check('ab-m-pdfask', loadPdfExportOptions().askBeforeExport, 'PDF export filter',
                  'Ask which balloons to leave out, and whether to print quantities, before each PDF export.', adminOnly, tag)}
          <button class="ab-menu-item" id="ab-m-bubble" role="menuitem"
            title="Colour, shape, line width and arrow for balloons.">Bubble settings&hellip;</button>
          <button class="ab-menu-item" id="ab-m-cat" role="menuitem" ${adminOnly}
            title="The order Renumber walks the number categories in.">Number category order&hellip;${tag}</button>
          <button class="ab-menu-item" id="ab-m-symbols" role="menuitem" ${adminOnly}
            title="Symbols stripped from recognised text.">Dimension symbol filter&hellip;${tag}</button>
          <button class="ab-menu-item" id="ab-m-tool" role="menuitem" ${adminOnly}
            title="The inspection tool new balloons start with.">Default inspection tool&hellip;${tag}</button>`;
    }

    /**
     * Show the Settings menu as a floating layer.
     *
     * Not rendered into the toolbar's HTML: .ab-toolbar is a 64px-tall
     * overflow-x:auto scroll container, so a menu inside it was clipped to that
     * strip and made the toolbar scroll. Keeping it outside also means the
     * frequent toolbar re-renders - the live progress text alone rebuilds it -
     * no longer tear the open menu down underneath the pointer.
     */
    private openSettingsMenu(): void {
        this.closeSettingsMenu();
        const btn = this.toolbarEl.querySelector('#btn-settings') as HTMLElement;
        if (!btn) return;

        const el = document.createElement('div');
        el.className = 'ab-menu';
        el.id = 'ab-settings-menu';
        el.setAttribute('role', 'menu');
        el.innerHTML = this.renderSettingsMenu();
        this.container.appendChild(el);

        const r = btn.getBoundingClientRect();
        // Kept on screen horizontally, and flipped above the button when there
        // is not room below - which is the common case on a short window,
        // since this toolbar sits near the top but the stage can be scrolled.
        el.style.left = `${Math.max(8, Math.min(r.left,
            document.documentElement.clientWidth - el.offsetWidth - 8))}px`;
        const roomBelow = window.innerHeight - r.bottom;
        el.style.top = (roomBelow < el.offsetHeight + 12 && r.top > el.offsetHeight + 12)
            ? `${r.top - el.offsetHeight - 4}px`
            : `${r.bottom + 4}px`;

        this.settingsMenuEl = el;
        this.settingsMenuOpen = true;
        btn.setAttribute('aria-expanded', 'true');
        btn.classList.add('active');

        this.wireSettingsMenu();
    }

    private closeSettingsMenu(): void {
        this.detachSettingsAway();
        this.settingsMenuEl?.remove();
        this.settingsMenuEl = null;
        if (!this.settingsMenuOpen) return;
        this.settingsMenuOpen = false;
        const btn = this.toolbarEl.querySelector('#btn-settings');
        btn?.setAttribute('aria-expanded', 'false');
        btn?.classList.remove('active');
    }

    private renderToolbar() {
        const hasImage = this.pages.length > 0;
        const totalPages = this.pages.length;
        const isActive = (b: boolean) => b ? 'active' : '';
        const pageRegions = this.regionsOnPage();

        this.toolbarEl.innerHTML = `
      <div class="ab-toolbar-group">
        <button id="btn-save" class="ab-btn ab-btn-primary" ${!hasImage || this.isSaving ? 'disabled' : ''}>
          ${getIcon('save', 'btn-icon')}
          <span class="btn-text">${this.isSaving ? 'Saving...' : 'Save'}</span>
        </button>
        <button id="btn-undo" class="ab-btn ab-btn-icon" title="Undo (Ctrl+Z)"
          ${this.history.canUndo ? '' : 'disabled'}>${getIcon('undo')}</button>
        <button id="btn-redo" class="ab-btn ab-btn-icon" title="Redo (Ctrl+Y)"
          ${this.history.canRedo ? '' : 'disabled'}>${getIcon('redo')}</button>
        <button id="btn-auto" class="ab-btn" ${!hasImage || this.isSaving ? 'disabled' : ''}
          title="Queue recognition for every page of this part. Replaces every automatic balloon on it; balloons you drew by hand and ones you deleted are kept.">
          ${getIcon('scanEye')} Auto Balloon${totalPages > 1 ? ' (all)' : ''}
        </button>
        ${totalPages > 1 ? `
        <button id="btn-auto-page" class="ab-btn" ${!hasImage || this.isSaving ? 'disabled' : ''}
          title="Recognition for THIS page only. Every other page keeps its balloons, including any you corrected by hand - and it finishes in a fraction of the time.">
          ${getIcon('scanEye')} This Page
        </button>` : ''}
        <button id="btn-renumber" class="ab-btn" ${!hasImage ? 'disabled' : ''}
          title="Renumber every page in turn, carrying on from one page to the next. On each page, areas are numbered by their own rules in area order; anything outside every area follows in reading order. Ctrl+Z undoes it.">
          ${getIcon('renumber')} Renumber${totalPages > 1 ? ' all pages' : ''}${pageRegions.length ? ` (${pageRegions.length} area${pageRegions.length === 1 ? '' : 's'})` : ''}
        </button>
        <button id="btn-export" class="ab-btn" ${!hasImage || this.isExporting ? 'disabled' : ''}
          title="Download the drawing with every balloon drawn on it, as a PDF">
          ${getIcon('export')} ${this.isExporting ? 'Exporting...' : 'Export PDF'}
        </button>
        <button id="btn-export-xls" class="ab-btn" ${!hasImage ? 'disabled' : ''}
          title="Download the balloon list as a spreadsheet - one line per characteristic, with its symbol and tolerances. Exports what is saved.">
          ${getIcon('export')} Export Excel
        </button>
        <button id="btn-checksheet" class="ab-btn" ${!this.annotations.length ? 'disabled' : ''}
          title="Every balloon as a check item - symbol, method, target, LSL and USL. Shows unsaved changes too.">
          ${getIcon('clipboardCheck')} Check sheet
        </button>
        <button id="btn-clear" class="ab-btn ab-btn-danger" ${!hasImage ? 'disabled' : ''}
          title="Remove balloons and masks - this page, or every page of the drawing. Ctrl+Z brings them back.">
          ${getIcon('eraser')} ${totalPages > 1 ? 'Clear…' : 'Clear Page'}
        </button>
      </div>

      ${/* The settings group: its own separated group after the actions, led
            by the gear. The colour and bubble controls already live in their
            own groups further along, so what is left here is the tolerance
            dialog and the settings menu - which has no menu bar to live in,
            this being a widget inside a page rather than a window, so it
            becomes a dropdown. */ ''}
      <div class="ab-toolbar-group">
        <button id="btn-tolerance" class="ab-btn" ${!hasImage ? 'disabled' : ''}
          title="Fill in the general tolerance for dimensions the drawing does not tolerance individually - the title block's .XXX rule, or ISO 2768.">
          ${getIcon('settings')} Default Tol
        </button>
        <div class="ab-menu-wrap">
          <button id="btn-settings" class="ab-btn ${isActive(this.settingsMenuOpen)}"
            aria-haspopup="true" aria-expanded="${this.settingsMenuOpen}"
            title="Ballooning settings - what recognition keeps, how balloons are numbered, and how datum features are found. These apply to every drawing, not just this one.">
            ${getIcon('settings')} Settings <span class="ab-caret">&#9662;</span>
          </button>
        </div>
      </div>

      <div class="ab-toolbar-group">
        <button id="tool-draw-manual" class="ab-btn ${isActive(this.toolMode === 'draw_box_manual')}" title="Draw a box to add a balloon">${getIcon('drawBox')} Add Balloon</button>
        <button id="tool-area-ocr" class="ab-btn ${isActive(this.toolMode === 'area_ocr')}" ${this.recognizing ? 'disabled' : ''}
          title="Area recognition (W): drag a box, and every dimension read inside it becomes its own balloon.">${getIcon('scanEye')} Area Read</button>
        <button id="tool-single-ocr" class="ab-btn ${isActive(this.toolMode === 'single_ocr')}" ${this.recognizing ? 'disabled' : ''}
          title="Single recognition (Q): drag a box, and everything read inside it becomes one balloon.">${getIcon('scanEye')} Single Read</button>
        <button id="btn-boxes" class="ab-btn ${isActive(!this.showBoxes)}"
          title="Show or hide every recognition box - a view setting only. Right-click a balloon to hide just its own box.">${getIcon('rectangle')} ${this.showBoxes ? 'Hide boxes' : 'Show boxes'}</button>
        <button id="tool-mask" class="ab-btn ${isActive(this.toolMode === 'mask_area')}" title="Mask an area out of recognition">${getIcon('mask')} Mask</button>
        <button id="tool-region" class="ab-btn ${isActive(this.toolMode === 'draw_region')}"
          title="Draw an area, then choose how the balloons inside it should be numbered. Right-click any area for its options. Areas may not overlap.">${getIcon('rectangle')} Area</button>
        ${pageRegions.length > 1 ? `
        <button id="btn-order-regions" class="ab-btn ab-btn-icon"
          title="Change which area is numbered first">${getIcon('listOrder')}</button>` : ''}
        ${pageRegions.length ? `
        <button id="btn-clear-regions" class="ab-btn ab-btn-icon"
          title="Remove every area on this page">${getIcon('eraser')}</button>` : ''}
      </div>

      ${hasImage ? `
      <div class="ab-toolbar-group">
        ${this.pageGridExtent() ? `
        <button id="btn-grid" class="ab-btn ${isActive(this.showGrid || this.adjustGrid)}"
          title="Draw the sheet's own grid over the drawing, with the cell each square would be filed under (G).">
          ${getIcon('rectangle')} Grid
        </button>
        <button id="btn-grid-adjust" class="ab-btn ${isActive(this.adjustGrid)}"
          title="Drag the grid lines onto the frame printed on the drawing, then re-file the balloons into the cells they actually fall in.">
          ${getIcon('select')} Adjust
        </button>` : ''}
        <button id="btn-grid-edit" class="ab-btn ${isActive(this.toolMode === 'frame_select')}"
          title="Set the sheet's corner cells and the drawing border the grid divides, then re-file every balloon.">
          Edit grid&hellip;
        </button>
        ${this.adjustGrid ? `
        <button id="btn-grid-apply" class="ab-btn ab-btn-primary">Apply&hellip;</button>
        <button id="btn-grid-reset" class="ab-btn ab-btn-icon"
          title="Back to equal spacing">${getIcon('reset')}</button>` : ''}
      </div>` : ''}

      <div class="ab-toolbar-group" style="border:none;">
        <button id="btn-zoom-out" class="ab-btn ab-btn-icon">${getIcon('zoomOut')}</button>
        <span style="font-size:12px;font-family:monospace;width:44px;text-align:center;">${(this.scale * 100).toFixed(0)}%</span>
        <button id="btn-zoom-in" class="ab-btn ab-btn-icon">${getIcon('zoomIn')}</button>
        <button id="btn-reset-zoom" class="ab-btn ab-btn-icon" title="Fit the page">${getIcon('reset')}</button>
        <button id="btn-rotate" class="ab-btn ab-btn-icon" title="Rotate this page 90° (R)">&#8635;</button>
        ${this.rotation() ? `<button id="btn-rotate-reset" class="ab-btn" title="Back to upright">${this.rotation()}° &times;</button>` : ''}
      </div>

      ${this.progressText ? `
      <div class="ab-toolbar-group ab-progress" style="border:none;" title="Live from the pipeline">
        <span class="ab-progress-dot"></span>
        <span class="ab-progress-text">${this.progressText.replace(/[&<>"]/g,
            c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]!))}</span>
      </div>` : ''}

      <div class="ab-toolbar-group" style="align-items:center;gap:4px;"
        title="${this.selectedIds.size ? 'Size of the selected balloons' : 'Balloon size for the whole drawing'}">
        <span style="font-size:11px;white-space:nowrap;">${this.selectedIds.size ? `Size (${this.selectedIds.size} sel.)` : 'Balloon Size'}</span>
        <button id="btn-balloon-size-down" class="ab-btn ab-btn-icon" title="Smaller">&#8722;</button>
        <span style="font-size:12px;font-family:monospace;width:44px;text-align:center;">${(this.balloonSizeMultiplier * 100).toFixed(0)}%</span>
        <button id="btn-balloon-size-up" class="ab-btn ab-btn-icon" title="Larger">&#43;</button>
        <button id="btn-balloon-size-reset" class="ab-btn ab-btn-icon" title="Reset size">${getIcon('reset')}</button>
        <button id="btn-size-scope" class="ab-btn ab-btn-icon" title="Size and position: new balloons only, this page or every page">${getIcon('settings')}</button>
        <button id="btn-bubble-style" class="ab-btn" title="Bubble settings: colour, shape, line width, arrow">Style&hellip;</button>
      </div>`;

        // Select / Pan and the pages have their own row above the toolbar: the
        // toolbar scrolls sideways on a narrow stage, and these are what you
        // reach for most. Tools on the left, pages in the middle.
        this.pagebarEl.innerHTML = `
        <div class="ab-pagebar-tools">
          <button id="tool-select" class="ab-btn ${isActive(this.toolMode === 'select')}" title="Select, move and resize">${getIcon('select')} Select</button>
          <button id="tool-pan" class="ab-btn ${isActive(this.toolMode === 'pan')}" title="Pan the drawing">${getIcon('pan')} Pan</button>
        </div>
        <div class="ab-pagebar-pages">${totalPages > 1 ? `
          <button id="btn-prev-page" class="ab-btn ab-btn-icon" title="Previous page (Left arrow)"
            ${this.currentPage === 0 ? 'disabled' : ''}>${getIcon('prev')}</button>
          <span class="ab-page-goto" title="Go to page (Left / Right arrow keys also turn pages)">Page
            <input id="btn-goto-page" class="ab-input" type="number" min="1" max="${totalPages}" value="${this.currentPage + 1}" />
            / ${totalPages}</span>
          <button id="btn-next-page" class="ab-btn ab-btn-icon" title="Next page (Right arrow)"
            ${this.currentPage === totalPages - 1 ? 'disabled' : ''}>${getIcon('next')}</button>` : ''}
        </div>
        <div></div>`;

        const on = (sel: string, fn: () => void) =>
            (this.toolbarEl.querySelector(sel) ?? this.pagebarEl.querySelector(sel))?.addEventListener('click', fn);

        on('#btn-save', () => this.handleSave());
        on('#btn-undo', () => this.undo());
        on('#btn-redo', () => this.redo());
        on('#btn-auto', () => this.handleAutoBalloon());
        on('#btn-auto-page', () => this.handleAutoBalloon(this.currentPage + 1));
        on('#btn-renumber', () => this.handleRenumber());
        on('#btn-export', () => this.handleExportPdf());
        on('#btn-export-xls', () => this.handleExportExcel());
        on('#btn-checksheet', () => this.openCheckSheet());
        on('#btn-tolerance', () => this.openDefaultToleranceDialog());
        on('#btn-clear', () => this.handleClearPage());

        on('#btn-settings', () => {
            if (this.settingsMenuOpen) this.closeSettingsMenu();
            else this.openSettingsMenu();
        });

        const setTool = (m: ToolMode) => this.setTool(m);
        on('#tool-select', () => setTool('select'));
        on('#tool-pan', () => setTool('pan'));
        on('#tool-draw-manual', () => setTool('draw_box_manual'));
        on('#tool-mask', () => setTool('mask_area'));
        on('#tool-region', () => setTool('draw_region'));
        on('#tool-area-ocr', () => setTool(this.toolMode === 'area_ocr' ? 'select' : 'area_ocr'));
        on('#tool-single-ocr', () => setTool(this.toolMode === 'single_ocr' ? 'select' : 'single_ocr'));
        on('#btn-boxes', () => {
            this.showBoxes = !this.showBoxes;
            writePref('dsrfq.ballooning.showBoxes', this.showBoxes);
            this.renderToolbar();
            this.renderCanvas();
        });
        on('#btn-grid-edit', () => this.openGridEdit());
        on('#btn-rotate', () => this.rotatePage(90));
        on('#btn-rotate-reset', () => this.rotatePage(null));
        on('#btn-size-scope', () => this.openSizeScope());
        on('#btn-bubble-style', () => this.openBubbleSettings());
        this.pagebarEl.querySelector('#btn-goto-page')?.addEventListener('change', e => {
            const n = parseInt((e.target as HTMLInputElement).value, 10);
            if (Number.isFinite(n)) this.setPage(Math.max(0, Math.min(this.pages.length - 1, n - 1)));
            else this.renderToolbar();
        });
        on('#btn-order-regions', () => this.openAreaOrderDialog());
        on('#btn-clear-regions', () => this.clearRegionsOnPage());

        on('#btn-grid', () => {
            // Turning the grid off while adjusting would leave the drag
            // handles on an invisible grid, so it ends the adjustment too.
            this.showGrid = !(this.showGrid || this.adjustGrid);
            if (!this.showGrid) this.adjustGrid = false;
            this.renderToolbar();
            this.renderCanvas();
        });
        on('#btn-grid-adjust', () => {
            this.adjustGrid = !this.adjustGrid;
            if (this.adjustGrid) this.showGrid = true;
            this.renderToolbar();
            this.renderCanvas();
        });
        on('#btn-grid-apply', () => this.applyGridAdjustment());
        on('#btn-grid-reset', () => {
            const extent = this.pageGridExtent();
            if (!extent) return;
            this.gridProfile = buildEqualProfile(
                extent, {x: 0, y: 0, width: 100, height: 100});
            this.renderCanvas();
        });

        on('#btn-zoom-in', () => this.setZoom(Math.min(5, this.scale + 0.1)));
        on('#btn-zoom-out', () => this.setZoom(Math.max(0.1, this.scale - 0.1)));
        on('#btn-reset-zoom', () => { this.fitToViewport(); this.renderCanvas(); });

        on('#btn-prev-page', () => this.setPage(this.currentPage - 1));
        on('#btn-next-page', () => this.setPage(this.currentPage + 1));

        const setSize = (v: number) => {
            this.balloonSizeMultiplier = v;
            this.dirty = true;
            this.renderToolbar();
            this.renderCanvas();
        };
        // With balloons selected the buttons size just those, as One Supply's
        // slider does; with none, the whole drawing.
        const sizeSelected = (step: number | null) => {
            for (const a of this.annotations) {
                if (!this.selectedIds.has(a.id)) continue;
                a.balloonScale = step === null ? undefined
                    : Math.max(0.2, Math.min(5, +(((a.balloonScale ?? 1) + step)).toFixed(2)));
            }
            this.dirty = true;
            this.renderCanvas();
        };
        on('#btn-balloon-size-up', () => this.selectedIds.size ? sizeSelected(0.1)
            : setSize(Math.min(5, +(this.balloonSizeMultiplier + 0.1).toFixed(2))));
        on('#btn-balloon-size-down', () => this.selectedIds.size ? sizeSelected(-0.1)
            : setSize(Math.max(0.1, +(this.balloonSizeMultiplier - 0.1).toFixed(2))));
        on('#btn-balloon-size-reset', () => this.selectedIds.size ? sizeSelected(null) : setSize(1.0));
    }

    // ─── Canvas ──────────────────────────────────────────────────────────

    /**
     * Scales the page so it fits the viewport, once, when a page first loads.
     * Without this the drawing opens at 100% of its 1000px layout width, which
     * on a tall sheet means the user starts scrolled into a corner.
     */
    private fitToViewport() {
        const vw = this.viewportEl.clientWidth;
        const vh = this.viewportEl.clientHeight;
        if (!vw || !vh || !this.containerWidth) return;
        const {w, h} = this.drawnSize();
        // A page turned on its side is as wide as it was tall.
        const rot = this.rotation();
        const sideways = rot === 90 || rot === 270;
        const bw = sideways ? h : w, bh = sideways ? w : h;
        this.scale = Math.min(vw / bw, vh / bh) * 0.95;
        // Rotated about its centre, the visible box's corner sits at
        // ((w - bw) / 2, (h - bh) / 2); pan so that corner is the origin.
        this.pan = {x: -this.scale * (w - bw) / 2, y: -this.scale * (h - bh) / 2};
        this.renderToolbar();
    }

    /** This page's view rotation, 0/90/180/270. */
    private rotation(): number {
        return (((this.pageRotation.get(this.currentPage) ?? 0) % 360) + 360) % 360;
    }

    /** The page's unscaled size in canvas pixels. */
    private drawnSize(): {w: number; h: number} {
        const w = BallooningWidget.BASE_WIDTH;
        return {w, h: w * (this.containerHeight / this.containerWidth)};
    }

    private canvasTransform(): string {
        const base = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.scale})`;
        const rot = this.rotation();
        if (!rot) return base;
        const {w, h} = this.drawnSize();
        return `${base} translate(${w / 2}px, ${h / 2}px) rotate(${rot}deg) translate(${-w / 2}px, ${-h / 2}px)`;
    }

    /**
     * Balloon diameter as a percentage of page height.
     *
     * Delegates to the shared helper rather than computing its own. This used
     * to return a flat 2.2 x multiplier while the PDF export derived the size
     * from the annotation boxes, so the two disagreed: an operator sized the
     * balloons against the canvas and the exported file came out with balloons
     * about a third smaller. One function, one answer.
     */
    private computeBalloonSizePct(): number {
        return computeBalloonSizePct(this.annotations, this.balloonSizeMultiplier);
    }

    private renderCanvas() {
        const hasImage = this.pages.length > 0;
        const emptyState = this.container.querySelector('#ab-empty-state') as HTMLElement;
        const imgEl = this.container.querySelector('#ab-image') as HTMLImageElement;
        const overlaysEl = this.container.querySelector('#ab-overlays') as HTMLElement;

        if (!hasImage) {
            this.canvasContainerEl.style.display = 'none';
            emptyState.classList.remove('hidden');
            return;
        }
        this.canvasContainerEl.style.display = 'block';
        emptyState.classList.add('hidden');

        const src = this.pages[this.currentPage];
        if (this.loadedPageSrc !== src) {
            // Record it before assigning: onload can fire synchronously from
            // cache, and it calls back into renderCanvas.
            this.loadedPageSrc = src;
            imgEl.onload = () => {
                this.containerWidth = imgEl.naturalWidth || 1000;
                this.containerHeight = imgEl.naturalHeight || 1400;
                this.pageSizes.set(this.currentPage, {w: this.containerWidth, h: this.containerHeight});
                this.fitToViewport();
                if (this.pendingFocus?.pageIndex === this.currentPage) {
                    this.centerOnRect(this.pendingFocus.rect);
                    this.pendingFocus = null;
                }
                this.renderCanvas();
            };
            imgEl.src = src;
        }

        // The container is absolutely positioned with no intrinsic width, so it
        // must be given one or the page collapses to a thumbnail. DS_ERP pins
        // 1000px here too; zoom and rotation are applied through the transform.
        this.canvasContainerEl.style.width = `${BallooningWidget.BASE_WIDTH}px`;
        this.canvasContainerEl.style.transformOrigin = '0 0';
        this.canvasContainerEl.style.transform = this.canvasTransform();
        overlaysEl.classList.toggle('ab-picking-parent', !!this.pickParentFor);
        overlaysEl.style.setProperty('--ab-scale', String(this.scale || 1));

        this.fdLayout.setContainerSize(this.containerWidth, this.containerHeight);
        const balloonSize = this.computeBalloonSizePct();
        const solved = this.fdLayout.solve(this.annotations, this.currentPage, balloonSize / 2);
        const onPage = this.annotations.filter(a => a.pageIndex === this.currentPage);
        const inSelect = this.toolMode === 'select';

        // Under everything, including the areas: the grid is the sheet's own
        // frame, and anything drawn on top of it is what the operator is
        // placing against it.
        let html = this.renderGridOverlay();
        const frame = this.pageFrame.get(this.currentPage);
        if (frame && (this.showGrid || this.adjustGrid))
            html += `<div class="ab-grid-frame" style="left:${frame.x}%;top:${frame.y}%;width:${frame.width}%;height:${frame.height}%;"></div>`;

        const handles = `
            <div class="sb-resize-handle top-left" data-handle="tl"></div>
            <div class="sb-resize-handle top-right" data-handle="tr"></div>
            <div class="sb-resize-handle bottom-left" data-handle="bl"></div>
            <div class="sb-resize-handle bottom-right" data-handle="br"></div>`;

        // Areas sit under the balloons so they read as a background wash, and
        // are labelled with the order they will be numbered in. A selected one
        // can be dragged and resized, like a balloon's box.
        for (const region of this.regionsOnPage()) {
            const sel = this.selectedRegionId === region.regionId;
            const mode = AREA_SORT_GROUPS.flatMap(g => g.modes)
                .find(m => m.key === region.sortMode);
            html += `<div class="ab-region ${sel ? 'selected' : ''} ${sel && inSelect ? 'movable' : ''}" data-region-id="${region.regionId}"
                style="left:${region.rect.x}%;top:${region.rect.y}%;width:${region.rect.width}%;height:${region.rect.height}%;
                       border-color:${region.color};background:${region.color}14;">
                <div class="ab-region-label" style="background:${region.color};"
                     title="Click to select, then drag to move. Right-click for this area's options">
                    ${region.orderIndex}. ${region.label}
                    <span class="ab-region-mode">${mode ? mode.label : region.sortMode}</span>
                </div>
                ${sel && inSelect ? handles : ''}
            </div>`;
        }

        html += renderViewLinks(this.viewLinks, this.currentPage, this.viewLinkHot);

        for (const mask of this.masks.filter(m => m.pageIndex === this.currentPage)) {
            const sel = this.selectedIds.has(mask.id) || this.selectedId === mask.id;
            html += `<div class="ab-overlay-mask mask-box ${sel ? 'selected' : ''} ${sel && inSelect ? 'movable' : ''}" data-id="${mask.id}"
                style="left:${mask.rect.x}%;top:${mask.rect.y}%;width:${mask.rect.width}%;height:${mask.rect.height}%;">
                ${sel && inSelect ? handles : ''}</div>`;
        }

        for (const ann of onPage) {
            const selected = this.selectedIds.has(ann.id);
            // A hidden box is not drawn at all - unless it is selected, when it
            // shows dashed so it can still be resized.
            const hidden = !this.showBoxes || ann.boxHidden;
            if (hidden && !selected) continue;
            // 'movable' gates dragging to select mode, so the drawing tools keep
            // working on top of an existing box instead of grabbing it.
            const movable = inSelect ? 'movable' : '';
            html += `<div data-id="${ann.id}" class="ab-annotation-box ${selected ? 'selected' : ''} ${movable} ${hidden ? 'ab-box-hidden' : ''} ${ann.audited ? 'audited' : ''} ${ann.isDatum ? 'datum' : ''}"
                style="left:${ann.rect.x}%;top:${ann.rect.y}%;width:${ann.rect.width}%;height:${ann.rect.height}%;z-index:${selected ? 4 : 2};">
                <div class="ab-annotation-bg"></div>
                ${selected && inSelect ? handles : ''}
            </div>`;
        }

        // Leader lines: from the balloon's edge to the nearest point on its box,
        // in the balloon's own colour, with an arrowhead where it asks for one.
        const W = this.containerWidth || 1000, H = this.containerHeight || 1400;
        html += `<svg style="position:absolute;left:0;top:0;width:100%;height:100%;z-index:2;pointer-events:none;overflow:visible;"
                      viewBox="0 0 100 100" preserveAspectRatio="none">`;
        for (const ann of onPage) {
            const style = resolveBalloonStyle(ann, this.shopStyle, this.selectedIds.has(ann.id));
            const size = balloonSize * style.scale;
            const pos = solved.get(ann.id);
            const bx = pos ? pos.x : ann.balloonX;
            const by = pos ? pos.y : ann.balloonY;
            const nearestX = Math.max(ann.rect.x, Math.min(bx, ann.rect.x + ann.rect.width));
            const nearestY = Math.max(ann.rect.y, Math.min(by, ann.rect.y + ann.rect.height));
            const ex = nearestX - bx, ey = nearestY - by;
            const dist = Math.sqrt(ex * ex + ey * ey);
            const r = 0.45 * size;
            if (dist < 0.01 || dist <= r + 0.01) continue;
            const sx = bx + (ex / dist) * r, sy = by + (ey / dist) * r;
            const lw = 0.08 + style.strokeWidth * 0.02;
            html += `<line x1="${sx.toFixed(3)}" y1="${sy.toFixed(3)}" x2="${nearestX.toFixed(3)}" y2="${nearestY.toFixed(3)}"
                           stroke="${style.stroke}" stroke-width="${lw.toFixed(3)}" stroke-linecap="round"/>`;
            if (style.arrow) {
                // Built in pixel space and mapped back, so the head is not
                // squashed by the non-uniform viewBox.
                const dx = (nearestX - sx) * W, dy = (nearestY - sy) * H;
                const len = Math.hypot(dx, dy) || 1;
                const ux = dx / len, uy = dy / len;
                const head = (size / 100) * H * 0.4;
                const tipX = nearestX * W / 100, tipY = nearestY * H / 100;
                const baseX = tipX - ux * head, baseY = tipY - uy * head;
                const pts = [[tipX, tipY], [baseX - uy * head * 0.45, baseY + ux * head * 0.45],
                             [baseX + uy * head * 0.45, baseY - ux * head * 0.45]]
                    .map(([x, y]) => `${(x / W * 100).toFixed(3)},${(y / H * 100).toFixed(3)}`).join(' ');
                html += `<polygon points="${pts}" fill="${style.stroke}"/>`;
            }
        }
        html += `</svg>`;

        for (const ann of onPage) {
            const style = resolveBalloonStyle(ann, this.shopStyle, this.selectedIds.has(ann.id));
            const size = balloonSize * style.scale;
            const pos = solved.get(ann.id);
            const bx = pos ? pos.x : ann.balloonX;
            const by = pos ? pos.y : ann.balloonY;
            const fontSize = (ann.subNumber ? 34 : 50) * textScale(style.shape);
            // data-id on the marker itself: DS_ERP looked the annotation up by
            // its balloon number, which picks the wrong one as soon as two
            // balloons share a number (notes and dimensions each start at 1).
            html += `<svg class="ab-balloon-badge balloon-handle ${this.pickParentFor === ann.id ? 'ab-picking' : ''}" data-id="${ann.id}"
                style="position:absolute;left:${bx}%;top:${by}%;height:${size}%;z-index:3;background:transparent;padding:0;overflow:visible;"
                viewBox="0 0 100 100">
                ${shapeSvg(style)}
                <text x="50" y="${textAnchorY(style.shape)}" fill="${style.text}" font-size="${fontSize}" font-family="sans-serif"
                      text-anchor="middle" dominant-baseline="central">${formatBalloonNumber(ann, this.subSeparator)}</text>
                ${ann.quantity && ann.quantity > 1 ? `<text x="100" y="50" fill="${style.stroke}" font-size="34" font-family="sans-serif"
                      dominant-baseline="central">${formatQuantityRange(ann.quantity)}</text>` : ''}
            </svg>`;
        }

        if (this.marquee) {
            const m = this.marquee.rect;
            html += `<div class="ab-marquee" style="left:${m.x}%;top:${m.y}%;width:${m.width}%;height:${m.height}%;"></div>`;
        }

        if (this.currentRect) {
            const modeClass = this.toolMode === 'mask_area' ? 'mask-mode'
                : this.toolMode === 'area_ocr' || this.toolMode === 'single_ocr' ? 'ocr-mode'
                : this.toolMode === 'frame_select' ? 'frame-mode' : '';
            html += `<div class="ab-drawing-preview ${modeClass}"
                style="left:${this.currentRect.x}%;top:${this.currentRect.y}%;width:${this.currentRect.width}%;height:${this.currentRect.height}%;"></div>`;
        }

        overlaysEl.innerHTML = html;
        this.wireGridHandles();
        this.updateCursor();
    }

    private updateCursor() {
        if (this.isPanning) this.viewportEl.style.cursor = 'grabbing';
        else if (this.toolMode === 'pan') this.viewportEl.style.cursor = 'grab';
        else if (this.toolMode === 'select') this.viewportEl.style.cursor = 'default';
        else this.viewportEl.style.cursor = 'crosshair';
    }

    // ─── Pointer interaction ─────────────────────────────────────────────

    /**
     * A pointer position as page percent. With the page rotated, the rotation
     * is undone about the page centre - which is also the centre of the
     * rotated element's bounding box, so the box is still the reference.
     */
    private getRelativeCoords(e: {clientX: number; clientY: number}) {
        const rect = this.canvasContainerEl.getBoundingClientRect();
        const rot = this.rotation();
        if (!rot) {
            return {
                x: ((e.clientX - rect.left) / rect.width) * 100,
                y: ((e.clientY - rect.top) / rect.height) * 100
            };
        }
        const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
        const t = -rot * Math.PI / 180;
        const dx = e.clientX - cx, dy = e.clientY - cy;
        const ux = dx * Math.cos(t) - dy * Math.sin(t);
        const uy = dx * Math.sin(t) + dy * Math.cos(t);
        const {w, h} = this.drawnSize();
        return {x: (ux / (w * this.scale) + 0.5) * 100, y: (uy / (h * this.scale) + 0.5) * 100};
    }

    private handleMouseDown(e: MouseEvent) {
        this.closeBalloonMenuFn?.();
        this.pointerMoved = false;
        // Middle or right button pans, as in One Supply; a right drag that
        // moved does not also open the menu (see the contextmenu handler).
        if (e.button === 1 || e.button === 2 || this.toolMode === 'pan') {
            e.preventDefault();
            this.isPanning = true;
            this.rightPanMoved = false;
            this.panStart = {x: e.clientX, y: e.clientY};
            this.updateCursor();
            return;
        }
        if (e.button !== 0) return;

        const target = e.target as HTMLElement;
        const mods = {ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey};

        // "Set as sub-number": this click picks the parent.
        if (this.pickParentFor) {
            e.preventDefault();
            e.stopPropagation();
            const hit = (target.closest('.balloon-handle') || target.closest('.ab-annotation-box')) as HTMLElement | null;
            const id = hit?.getAttribute('data-id');
            if (id && id !== this.pickParentFor) this.completeSubNumber(id);
            else this.cancelPickParent();
            return;
        }

        // A view label or a cut's letter: go to the other end of the link.
        const vl = target.closest('[data-vl-go]') as HTMLElement | null;
        if (vl && this.toolMode === 'select') {
            e.preventDefault();
            e.stopPropagation();
            this.gotoViewLink(vl.dataset.vl!, vl.dataset.vlGo as 'mark' | 'view');
            return;
        }

        const balloonHandle = target.closest('.balloon-handle') as HTMLElement;
        if (balloonHandle) {
            e.stopPropagation();
            const id = balloonHandle.getAttribute('data-id');
            const ann = this.annotations.find(a => a.id === id);
            if (ann) {
                if (mods.ctrl || mods.shift) { this.selectAnnotationWithModifiers(ann.id, mods); return; }
                this.isDraggingBalloon = true;
                this.draggedBalloonId = ann.id;
                this.dragStartRaw = this.getRelativeCoords(e);
                if (!this.selectedIds.has(ann.id)) this.selectAnnotation(ann.id);
            }
            return;
        }

        // A balloon's box, or a selected mask or area: drag to move, handles to resize.
        const boxEl = target.closest('.ab-annotation-box.movable, .mask-box.movable, .ab-region.movable') as HTMLElement;
        if (boxEl) {
            const regionId = boxEl.getAttribute('data-region-id');
            const id = boxEl.getAttribute('data-id');
            const isBalloon = !regionId && this.annotations.some(a => a.id === id);
            if (isBalloon && (mods.ctrl || mods.shift)) {
                e.stopPropagation();
                this.selectAnnotationWithModifiers(id!, mods);
                return;
            }
            const box: {rect: Rect} | undefined = regionId
                ? this.regions.find(r => r.regionId === regionId)
                : (this.annotations.find(a => a.id === id) ?? this.masks.find(m => m.id === id));
            if (box) {
                e.stopPropagation();
                this.activeBox = box;
                this.boxMinSizePct = 0.2;
                this.dragStartBoxCoords = this.getRelativeCoords(e);
                this.originalBoxRect = {...box.rect};
                const handle = target.closest('.sb-resize-handle') as HTMLElement;
                if (handle) {
                    e.preventDefault();
                    this.isResizingBox = true;
                    this.boxResizeHandle = handle.getAttribute('data-handle');
                } else {
                    this.isDraggingBox = true;
                }
                if (regionId) { this.selectedRegionId = regionId; this.renderCanvas(); }
                else if (!this.selectedIds.has(id!)) this.selectAnnotation(id);
            }
            return;
        }

        if (this.toolMode === 'select') {
            const maskEl = target.closest('.mask-box');
            const regionLabel = target.closest('.ab-region-label');
            if (maskEl) { this.selectAnnotation(maskEl.getAttribute('data-id')); return; }
            if (regionLabel) {
                this.selectedRegionId = regionLabel.closest('.ab-region')!.getAttribute('data-region-id');
                this.selectAnnotation(null);
                this.renderCanvas();
                return;
            }
            // Empty drawing: a rubber band, as One Supply. A click that does not
            // drag clears the selection on release.
            const start = this.getRelativeCoords(e);
            this.marquee = {start, rect: {x: start.x, y: start.y, width: 0, height: 0}, additive: mods.ctrl || mods.shift};
            return;
        }

        const coords = this.getRelativeCoords(e);
        this.dragStart = coords;
        this.isDragging = true;
        this.currentRect = {x: coords.x, y: coords.y, width: 0, height: 0};
    }

    private handleMouseMove(e: MouseEvent) {
        if (e.buttons) this.pointerMoved = true;
        if (this.marquee) {
            const c = this.getRelativeCoords(e);
            const s = this.marquee.start;
            this.marquee.rect = {
                x: Math.min(s.x, c.x), y: Math.min(s.y, c.y),
                width: Math.abs(c.x - s.x), height: Math.abs(c.y - s.y),
            };
            this.renderCanvas();
            return;
        }

        if (this.isDraggingBox && this.activeBox && this.dragStartBoxCoords && this.originalBoxRect) {
            const c = this.getRelativeCoords(e);
            const dx = c.x - this.dragStartBoxCoords.x;
            const dy = c.y - this.dragStartBoxCoords.y;
            const b = this.activeBox;
            b.rect.x = Math.max(0, Math.min(100 - b.rect.width, this.originalBoxRect.x + dx));
            b.rect.y = Math.max(0, Math.min(100 - b.rect.height, this.originalBoxRect.y + dy));
            this.dirty = true;
            this.renderCanvas();
            return;
        }

        if (this.isResizingBox && this.activeBox && this.dragStartBoxCoords && this.originalBoxRect) {
            const c = this.getRelativeCoords(e);
            const dx = c.x - this.dragStartBoxCoords.x;
            const dy = c.y - this.dragStartBoxCoords.y;
            const o = this.originalBoxRect;
            const min = this.boxMinSizePct;
            const r = {...o};
            switch (this.boxResizeHandle) {
                case 'tl':
                    r.width = Math.max(min, o.width - dx); r.height = Math.max(min, o.height - dy);
                    r.x = o.x + o.width - r.width;        r.y = o.y + o.height - r.height; break;
                case 'tr':
                    r.width = Math.max(min, o.width + dx); r.height = Math.max(min, o.height - dy);
                    r.y = o.y + o.height - r.height; break;
                case 'bl':
                    r.width = Math.max(min, o.width - dx); r.height = Math.max(min, o.height + dy);
                    r.x = o.x + o.width - r.width; break;
                default:
                    r.width = Math.max(min, o.width + dx); r.height = Math.max(min, o.height + dy); break;
            }
            this.activeBox.rect = r;
            this.dirty = true;
            this.renderCanvas();
            return;
        }

        if (this.isDraggingBalloon && this.draggedBalloonId && this.dragStartRaw) {
            const ann = this.annotations.find(a => a.id === this.draggedBalloonId);
            if (ann) {
                const c = this.getRelativeCoords(e);
                ann.balloonX = Math.max(0, Math.min(100, ann.balloonX + (c.x - this.dragStartRaw.x)));
                ann.balloonY = Math.max(0, Math.min(100, ann.balloonY + (c.y - this.dragStartRaw.y)));
                this.dragStartRaw = c;
                this.dirty = true;
                this.renderCanvas();
            }
            return;
        }

        if (this.isPanning && this.panStart) {
            const mx = e.clientX - this.panStart.x, my = e.clientY - this.panStart.y;
            if (Math.abs(mx) + Math.abs(my) > 2) this.rightPanMoved = true;
            this.pan.x += mx;
            this.pan.y += my;
            this.panStart = {x: e.clientX, y: e.clientY};
            this.renderCanvas();
            return;
        }

        if (this.isDragging && this.dragStart) {
            const c = this.getRelativeCoords(e);
            this.currentRect = {
                x: Math.min(this.dragStart.x, c.x),
                y: Math.min(this.dragStart.y, c.y),
                width: Math.abs(c.x - this.dragStart.x),
                height: Math.abs(c.y - this.dragStart.y)
            };
            this.renderCanvas();
        }
    }

    private handleMouseUp(_e: MouseEvent) {
        if (this.marquee) {
            const m = this.marquee.rect;
            const additive = this.marquee.additive;
            this.marquee = null;
            if (m.width > 0.4 && m.height > 0.4) {
                const hit = this.annotations.filter(a => a.pageIndex === this.currentPage
                    && rectsOverlap(a.rect, m)).map(a => a.id);
                const next = additive ? new Set([...this.selectedIds, ...hit]) : new Set(hit);
                this.selectedIds = next;
                this.selectedId = hit[0] ?? (next.size ? [...next][0] : null);
                this.selectionAnchor = this.selectedId;
                this.batchEdit = emptyBatchEdit();
                this.renderCanvas();
                this.renderProperties();
                this.renderTable();
            } else if (!additive) {
                this.selectedRegionId = null;
                this.selectAnnotation(null);
            } else {
                this.renderCanvas();
            }
            return;
        }

        const wasEditing = this.isDraggingBox || this.isResizingBox || this.isDraggingBalloon;
        // A plain click on a balloon already in a multi-selection narrows the
        // selection to it on release - the drag that did not happen is what
        // kept the others selected on the way down.
        const clickedId = !this.pointerMoved && this.selectedIds.size > 1
            ? (this.draggedBalloonId ?? (this.activeBox && (this.activeBox as any).id)) : null;
        if (this.isDraggingBox || this.isResizingBox) {
            this.isDraggingBox = this.isResizingBox = false;
            this.activeBox = null;
            this.boxResizeHandle = null;
            this.renderTable();
        }
        if (this.isDraggingBalloon) {
            this.isDraggingBalloon = false;
            this.draggedBalloonId = null;
        }
        // The whole drag is one undo step, taken now it has ended.
        if (wasEditing) this.recordHistory();
        if (clickedId && this.annotations.some(a => a.id === clickedId)) this.selectAnnotation(clickedId);
        if (this.isPanning) {
            this.isPanning = false;
            this.updateCursor();
        }

        if (this.isDragging && this.currentRect) {
            const rect = this.currentRect;
            this.isDragging = false;
            this.dragStart = null;
            this.currentRect = null;
            // Ignore an accidental click-sized rectangle.
            if (rect.width > 0.3 && rect.height > 0.3) {
                if (this.toolMode === 'mask_area') this.addMask(rect);
                else if (this.toolMode === 'draw_region') this.addRegion(rect);
                else if (this.toolMode === 'area_ocr') this.recognizeRegion(rect, 'area');
                else if (this.toolMode === 'single_ocr') this.recognizeRegion(rect, 'single');
                else if (this.toolMode === 'frame_select') this.setGridFrame(rect);
                else this.addAnnotation(rect);
            }
            this.renderAll();
        }
    }

    /** Zoom about the pointer, x1.1 a notch, as One Supply. */
    private handleWheel(e: WheelEvent) {
        e.preventDefault();
        const vp = this.viewportEl.getBoundingClientRect();
        const cx = e.clientX - vp.left, cy = e.clientY - vp.top;
        const old = this.scale;
        const next = Math.max(0.1, Math.min(5, old * (e.deltaY > 0 ? 1 / 1.1 : 1.1)));
        if (next === old) return;
        this.pan = {x: cx - (cx - this.pan.x) * (next / old), y: cy - (cy - this.pan.y) * (next / old)};
        this.setZoom(next);
    }

    private setZoom(v: number) {
        this.scale = v;
        this.renderToolbar();
        this.renderCanvas();
    }

    private setPage(i: number) {
        if (i < 0 || i >= this.pages.length) return;
        if (i === this.currentPage) return;
        this.currentPage = i;
        this.selectedId = null;
        this.selectedIds = new Set();
        // Each page has its own grid: the last page's lines must not be drawn
        // on this one just because the two sheets share a frame size.
        this.gridProfile = null;
        this.gridRowId = null;
        this.adjustGrid = false;
        this.marquee = null;
        this.pickParentFor = null;
        this.renderAll();
    }

    /** Turn the page view 90 degrees (R), or back to upright with null. Remembered per page. */
    private rotatePage(delta: number | null) {
        const next = delta === null ? 0 : (((this.rotation() + delta) % 360) + 360) % 360;
        if (next) this.pageRotation.set(this.currentPage, next);
        else this.pageRotation.delete(this.currentPage);
        this.fitToViewport();
        this.renderCanvas();
        const page = this.currentPage + 1;
        saveGridProfile(this.costingPartId, page, null, this.gridRowIds.get(page) ?? null, {rotation: next})
            .then(id => { if (id) this.gridRowIds.set(page, id); })
            .catch(e => notifyWarning('The rotation could not be remembered: ' + (e?.message ?? e)));
    }

    // ─── Mutations ───────────────────────────────────────────────────────

    private nextBalloonNumber(): number {
        // Children share their parent's balloonNumber, so they cannot push the
        // sequence forward here - which is exactly the property that makes a
        // sub-number free to add.
        const nums = this.annotations
            .map(a => Number(a.balloonNumber))
            .filter(n => Number.isFinite(n));
        return nums.length ? Math.max(...nums) + 1 : 1;
    }

    /** A new balloon over `rect`, numbered `num`, filled with the shop's defaults. */
    private makeAnnotation(rect: Rect, num: number, page = this.currentPage): BalloonAnnotation {
        const cell = this.cellFor(rect, page);
        return {
            id: newId(),
            balloonNumber: num,
            // Park the marker just above-right of the box; the force-directed
            // layout moves it off any neighbour on the next render.
            balloonX: Math.min(100, rect.x + rect.width + 2),
            balloonY: Math.max(0, rect.y - 2),
            rect,
            content: '',
            originalContent: '',
            type: 'Dimension',
            status: 'Pending',
            pageIndex: page,
            auto: false,
            gridStart: cell.gridStart,
            gridEnd: cell.gridEnd,
            section: cell.section,
            isNote: false,
            inspectionToolId: this.editorDefaults.defaultInspectionToolId,
            viewRect: rect,
            analyser: {diameter: false, datums: [], modifiers: []}
        };
    }

    private addAnnotation(rect: Rect) {
        const ann = this.makeAnnotation(rect, this.nextBalloonNumber());
        this.annotations.push(ann);
        this.selectedId = ann.id;
        this.selectedIds = new Set([ann.id]);
        this.dirty = true;
    }

    /**
     * The grid cell a box falls in, and the sheet extent to file it under -
     * taken from the page's other balloons, since a crop tells the engine
     * nothing about the sheet.
     */
    private cellFor(rect: Rect, page: number): {section: string; gridStart: string; gridEnd: string} {
        const on = this.annotations.find(a => a.pageIndex === page && a.gridStart && a.gridEnd);
        if (!on) return {section: '', gridStart: '', gridEnd: ''};
        const extent = parseGridExtent(on.gridStart, on.gridEnd);
        if (!extent) return {section: '', gridStart: on.gridStart, gridEnd: on.gridEnd};
        const stored = this.gridByPage.get(page + 1)?.profile;
        const profile = page === this.currentPage
            ? this.currentGridProfile()
            : (stored && isProfileValidFor(stored, extent)
                ? stored
                : buildEqualProfile(extent, this.pageFrame.get(page) ?? {x: 0, y: 0, width: 100, height: 100}));
        const section = profile
            ? belongFromProfile(rect.x + rect.width / 2, rect.y + rect.height / 2, extent, profile)
            : '';
        return {section, gridStart: on.gridStart, gridEnd: on.gridEnd};
    }

    /**
     * Area (W) and Single (Q) recognition: read what is inside the box the
     * operator drew, and add it as balloons. See BalloonRegionRecognizer.cs.
     * Nothing is saved; the added balloons are one undo step.
     */
    private async recognizeRegion(rect: Rect, mode: 'area' | 'single') {
        const src = this.pages[this.currentPage];
        if (!src || this.recognizing) return;

        if (mode === 'single' && this.editorDefaults.singleAsScreenshot) {
            const ann = this.makeAnnotation(rect, this.nextBalloonNumber());
            ann.exportMode = 'screenshot';
            this.annotations.push(ann);
            this.selectedId = ann.id;
            this.selectedIds = new Set([ann.id]);
            this.dirty = true;
            this.renderAll();
            return;
        }

        this.recognizing = true;
        this.progressText = mode === 'area' ? 'Reading the area…' : 'Reading the box…';
        this.renderToolbar();
        try {
            const res = await CostingPartBalloonsService.RecognizeRegion({
                CostingPartId: this.costingPartId,
                PageImage: src.replace(/^\/?upload\//, ''),
                Mode: mode,
                X: rect.x, Y: rect.y, Width: rect.width, Height: rect.height,
            });
            const items = (res.Items ?? []).filter(i => i.BBoxX2! > i.BBoxX1! && i.BBoxY2! > i.BBoxY1!);
            if (!items.length) {
                notifyWarning('Nothing was recognised in that box.');
                return;
            }
            // Numbered in reading order within the box.
            items.sort((a, b) => (Math.round(a.BBoxY1! * 2) - Math.round(b.BBoxY1! * 2)) || (a.BBoxX1! - b.BBoxX1!));
            const symbols = loadSymbolFilter().symbols;
            let next = this.nextBalloonNumber();
            const added: BalloonAnnotation[] = [];
            for (const it of items) {
                const r = {x: it.BBoxX1!, y: it.BBoxY1!, width: it.BBoxX2! - it.BBoxX1!, height: it.BBoxY2! - it.BBoxY1!};
                const ann = this.makeAnnotation(r, next++);
                ann.content = symbols.length ? applySymbolFilter(it.Symbol, symbols) : (it.Symbol ?? '');
                ann.originalContent = it.OriginalSymbol ?? '';
                ann.upperTol = it.UpperTol ?? '';
                ann.lowerTol = it.LowerTol ?? '';
                ann.quantity = it.Quantity && it.Quantity > 1 ? it.Quantity : undefined;
                ann.isNote = !!it.IsNote;
                if (ann.isNote) ann.type = 'Note';
                added.push(ann);
            }
            this.annotations.push(...added);
            this.selectedIds = new Set(added.map(a => a.id));
            this.selectedId = added[0].id;
            this.dirty = true;
            this.renderAll();
            notifySuccess(`Added ${added.length} balloon${added.length === 1 ? '' : 's'} from the ${mode === 'area' ? 'area' : 'box'}. Ctrl+Z to undo.`);
        } catch (e: any) {
            // serviceRequest has already shown the server's message.
            console.warn('Region recognition failed', e);
        } finally {
            this.recognizing = false;
            this.progressText = '';
            this.renderToolbar();
        }
    }

    private addMask(rect: Rect) {
        this.masks.push({id: newId(), rect, pageIndex: this.currentPage});
        this.dirty = true;
    }

    private updateAnnotation(id: string, patch: Partial<BalloonAnnotation>) {
        const ann = this.annotations.find(a => a.id === id);
        if (!ann) return;
        Object.assign(ann, patch);
        this.dirty = true;
        this.renderCanvas();
        this.renderTable();
    }

    /** The property panel's "Tolerance from" list, with the balloon's own label selected. */
    private toleranceStandardOptions(ann: BalloonAnnotation): string {
        const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g,
            c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]!));
        const current = ann.toleranceStandard ?? '';
        const known = standardOptions(loadToleranceSettings());
        // A label the list no longer has (a deleted scheme, or the first
        // port's ".XXX") is still shown, or the select would silently claim
        // the balloon was typed by hand.
        const list = current && !known.includes(current) ? [...known, current] : known;
        return `<option value="">Typed, or from the drawing</option>`
            + list.map(o => `<option value="${esc(o)}" ${o === current ? 'selected' : ''}>${esc(o)}${
                known.includes(o) ? '' : ' (earlier label)'}</option>`).join('');
    }

    /**
     * Recalculate one balloon from the scheme or ISO class picked for it.
     * Port of One Supply's property-editor recalculation
     * (calculate_default_tolerance_for_annotation).
     */
    private applyToleranceStandard(id: string, standard: string) {
        const ann = this.annotations.find(a => a.id === id);
        if (!ann) return;
        if (!standard) {
            // Back to "typed": the values stay, only the label goes.
            this.updateAnnotation(id, {toleranceStandard: undefined});
            return;
        }
        const settings = loadToleranceSettings();
        const refuse = (message: string) => {
            notifyWarning(message);
            this.renderProperties();
        };
        const src = sourceFromStandard(standard, settings);
        if (!src)
            return refuse(`"${standard}" is not a scheme any more. The tolerance was left as it was.`);
        if (settings.exclude.reference && isReferenceForTolerance(ann.content))
            return refuse('This is a reference dimension, which takes no tolerance. '
                + 'Un-tick that exclusion under Default Tol to allow it.');
        if (settings.exclude.theoretical && isTheoreticalDimension(ann.content))
            return refuse('This is a basic dimension, which is exact by definition. '
                + 'Un-tick that exclusion under Default Tol to allow it.');

        const rule = calcForSource(src, ann.content, !!ann.isDatum);
        if (!rule || rule === 'not-covered')
            return refuse(`${sourceStandard(src)} has no rule for "${ann.content}". `
                + 'The tolerance was left as it was.');
        this.updateAnnotation(id, {
            upperTol: rule.upper, lowerTol: rule.lower, toleranceStandard: sourceStandard(src),
        });
        this.renderProperties();
    }

    /**
     * Delete everything selected - balloons and masks - and close the number
     * gap, as One Supply does. Undoable, so no confirmation for the key.
     */
    private deleteSelected() {
        const ids = new Set(this.selectedIds);
        if (this.selectedId) ids.add(this.selectedId);
        if (!ids.size) return;

        const maskIds = new Set(this.masks.filter(m => ids.has(m.id)).map(m => m.id));
        const outcome = deleteBalloons(this.annotations, ids);
        if (!outcome.removed.length && !maskIds.size) return;

        this.annotations = outcome.kept;
        // Kept rather than dropped: a save records the removal so a later
        // re-run of recognition does not bring it back.
        this.removedAnnotations.push(...outcome.removed);
        if (maskIds.size) this.masks = this.masks.filter(m => !maskIds.has(m.id));

        this.selectedId = null;
        this.selectedIds = new Set();
        this.selectionAnchor = null;
        this.batchEdit = emptyBatchEdit();
        this.dirty = true;
        this.renderAll();

        const n = outcome.removed.length;
        if (n) notifySuccess(`Deleted ${n} balloon${n === 1 ? '' : 's'}`
            + (outcome.renumbered ? `; ${outcome.renumbered} renumbered to close the gap` : '')
            + '. Ctrl+Z to undo.');
    }

    /**
     * Give a balloon a new number and slide the others along to make room -
     * the list's order changes with it. One undo step. See moveBalloonNumber.
     */
    private moveNumber(id: string, target: number) {
        const outcome = moveBalloonNumber(this.annotations, id, target);
        if (!outcome.moved) {
            // Re-render anyway: the field or cell the operator typed into
            // still shows their number, and must go back to the real one.
            this.renderTable();
            if (this.selectedId === id) this.renderProperties();
            if (outcome.reason) notifyWarning(`Number not changed: ${outcome.reason}.`);
            return;
        }
        this.dirty = true;
        this.renderAll();
        const s = outcome.shifted === 1 ? '' : 's';
        notifySuccess(`Balloon ${outcome.from} is now ${outcome.to}`
            + (outcome.clamped ? ' (the nearest end of the sequence)' : '')
            + (outcome.shifted ? `; ${outcome.shifted} other${s} moved along to make room` : '')
            + '. Ctrl+Z to undo.');
    }

    /**
     * SMARTQC's check sheet layout over this drawing's balloons - see
     * BallooningCheckSheet. Built from the balloons as they are in the editor
     * right now, unsaved edits included. Picking a line goes to its balloon.
     */
    private openCheckSheet() {
        const lines = checkSheetLines(this.annotations,
            {subSeparator: this.subSeparator, unit: this.partUnit, viewOf: a => this.viewTitleOf(a)});
        showCheckSheet(this.container, lines, {
            unsaved: this.dirty,
            onPick: id => {
                const ann = this.annotations.find(a => a.id === id);
                if (!ann) return;
                if (ann.pageIndex !== this.currentPage) this.setPage(ann.pageIndex);
                this.selectAnnotation(id);
            },
            // DSEFACTORY SMARTQC's three Excel forms, filled from these lines.
            onExport: async form => {
                try {
                    await downloadCheckSheetExcel(
                        resolveServiceUrl('Costing/CostingPartBalloons/ExportCheckSheet'),
                        this.costingPartId, form, lines);
                } catch (e: any) {
                    notifyError(`Could not export the check sheet: ${e?.message ?? e}`);
                }
            },
        });
    }

    /** Swap a list row's number for a box to type a new one into. */
    private editNumberInline(td: HTMLElement, e: Event) {
        e.stopPropagation();
        e.preventDefault();
        const id = td.dataset.numEdit!;
        const ann = this.annotations.find(a => a.id === id);
        if (!ann || td.querySelector('input')) return;

        const input = document.createElement('input');
        input.type = 'number';
        input.min = '1';
        input.step = '1';
        input.className = 'ab-no-input';
        input.value = String(ann.balloonNumber);
        input.setAttribute('aria-label', `New number for balloon ${ann.balloonNumber}`);
        td.replaceChildren(input);
        input.focus();
        input.select();

        let done = false;
        const finish = (apply: boolean) => {
            if (done) return;
            done = true;
            const n = parseInt(input.value, 10);
            if (apply && Number.isFinite(n) && n !== ann.balloonNumber) this.moveNumber(id, n);
            else this.renderTable();
        };
        input.addEventListener('keydown', (k: KeyboardEvent) => {
            // Kept from the widget's own shortcuts: Delete here must edit the
            // number, not delete the balloon.
            k.stopPropagation();
            if (k.key === 'Enter') { k.preventDefault(); finish(true); }
            else if (k.key === 'Escape') { k.preventDefault(); finish(false); }
        });
        input.addEventListener('blur', () => finish(true));
        // A click inside the box must not re-select the row and re-render it away.
        input.addEventListener('click', (c: any) => c.stopPropagation());
        input.addEventListener('mousedown', (c: any) => c.stopPropagation());
    }

    private selectAnnotation(id: string | null) {
        this.selectedId = id;
        this.selectedIds = id ? new Set([id]) : new Set<string>();
        this.selectionAnchor = id;
        // Leaving a batch behind would let a stale dirty field apply to the
        // next selection the operator makes.
        this.batchEdit = emptyBatchEdit();
        // Pan before rendering, so the canvas is drawn once in its final place.
        if (id) {
            const ann = this.annotations.find(
                a => a.id === id && a.pageIndex === this.currentPage);
            if (ann) this.ensureAnnotationVisible(ann);
        }
        this.renderCanvas();
        this.renderProperties();
        this.renderTable();
    }

    /**
     * Select with ctrl/shift, the way any list on this platform behaves.
     *
     * The ordering handed to resolveSelection is the TABLE's order, not the
     * array's - a shift-range has to cover what the operator can see between
     * the two rows they clicked, which is sorted by balloon number.
     */
    private selectAnnotationWithModifiers(
        id: string, modifiers: {ctrl?: boolean; shift?: boolean}
    ) {
        if (!modifiers.ctrl && !modifiers.shift) {
            this.selectAnnotation(id);
            return;
        }
        const ordered = listOrder(this.annotations, this.tableAllPages, this.currentPage)
            .map(a => a.id);

        const {selected, anchor} = resolveSelection(
            this.selectedIds, this.selectionAnchor, id, ordered, modifiers);

        this.selectedIds = selected;
        this.selectionAnchor = anchor;
        // The primary follows the click while it is still in the set, so the
        // panel keeps showing something the operator just touched.
        this.selectedId = selected.has(id) ? id : (selected.size ? [...selected][0] : null);
        this.batchEdit = emptyBatchEdit();

        this.renderCanvas();
        this.renderProperties();
        this.renderTable();
    }

    /**
     * Bring a balloon into view if it is currently outside the viewport.
     *
     * Selecting a row in the table used to highlight a balloon that could be
     * anywhere off-screen, which looked like nothing had happened. Clicking a
     * balloon on the canvas already implies it is visible, so this leaves the
     * view alone in that case rather than re-centring under the cursor.
     *
     * .ab-canvas-container is transform-origin: top left, so a point maps to
     * the viewport as pan + scale * local -- no origin correction needed.
     */
    /**
     * Jump from a section's label to its cut, or back: switch page if the
     * other end is on another sheet, centre on it and flash it.
     */
    private gotoViewLink(id: string, to: 'mark' | 'view') {
        const link = this.viewLinks.find(l => l.id === id);
        if (!link) return;
        if (to === 'mark' && !isLinked(link)) {
            notifyWarning(`Where ${link.title} was cut from was not found on this drawing.`);
            return;
        }
        const target = linkTarget(link, to);
        if (!target) return;
        window.clearTimeout(this.viewLinkHotTimer);
        this.viewLinkHot = id;
        this.viewLinkHotTimer = window.setTimeout(() => { this.viewLinkHot = null; this.renderCanvas(); }, 3000);
        if (target.pageIndex !== this.currentPage) {
            // Centred once the new page has loaded and been fitted - fitting
            // would undo a pan made now.
            this.pendingFocus = target;
            this.setPage(target.pageIndex);
            return;
        }
        this.centerOnRect(target.rect);
        this.renderCanvas();
    }

    /**
     * Pan so a page-percent rectangle sits in the middle of the viewport,
     * zooming in first if it would be too small to see - at the fitted zoom a
     * cut's two letters are a few pixels each.
     */
    private centerOnRect(r: PctRect) {
        const vw = this.viewportEl.clientWidth, vh = this.viewportEl.clientHeight;
        if (!vw || !vh || !this.containerWidth) return;
        const {w, h} = this.drawnSize();
        const tw = (r.width / 100) * w, th = (r.height / 100) * h;
        const want = Math.min(vw, vh) * 0.45;
        if (Math.max(tw, th) * this.scale < want * 0.6) {
            this.scale = Math.max(0.1, Math.min(5, want / Math.max(tw, th, 1)));
            this.renderToolbar();
        }
        this.pan = {
            x: vw / 2 - this.scale * ((r.x + r.width / 2) / 100) * w,
            y: vh / 2 - this.scale * ((r.y + r.height / 2) / 100) * h,
        };
    }

    /** The view a balloon is in, "SECTION A-A", or null. */
    private viewTitleOf(a: BalloonAnnotation): string | null {
        return viewOf(this.viewLinks, a.pageIndex, a.rect)?.title ?? null;
    }

    private ensureAnnotationVisible(ann: BalloonAnnotation) {
        const vw = this.viewportEl.clientWidth;
        const vh = this.viewportEl.clientHeight;
        if (!vw || !vh || !this.containerWidth) return;

        const drawnHeight = BallooningWidget.BASE_WIDTH *
            (this.containerHeight / this.containerWidth);
        const localX = ((ann.rect.x + ann.rect.width / 2) / 100) * BallooningWidget.BASE_WIDTH;
        const localY = ((ann.rect.y + ann.rect.height / 2) / 100) * drawnHeight;

        const screenX = this.pan.x + this.scale * localX;
        const screenY = this.pan.y + this.scale * localY;

        // A balloon flush against an edge is technically visible but unreadable,
        // so treat the outer band as off-screen too.
        const margin = 60;
        if (screenX >= margin && screenX <= vw - margin &&
            screenY >= margin && screenY <= vh - margin)
            return;

        this.pan = {
            x: vw / 2 - this.scale * localX,
            y: vh / 2 - this.scale * localY,
        };
    }

    // ─── Areas ───────────────────────────────────────────────────────────

    private regionsOnPage(): AreaRegion[] {
        return this.regions
            .filter(r => r.pageIndex === this.currentPage)
            .sort((a, b) => a.orderIndex - b.orderIndex);
    }

    /**
     * The sheet's physical height, so a row tolerance quoted in inches lands
     * at the right percentage. Pages render at 300 DPI (convertPdfToImages),
     * so the natural pixel height divided by 300 is the height in inches.
     * Falls back to the module default when the image has not measured yet.
     */
    private pageHeightInches(): number | undefined {
        const img = this.container.querySelector('#ab-image') as HTMLImageElement;
        const px = img?.naturalHeight;
        return px ? px / 300 : undefined;
    }

    private addRegion(rect: Rect) {
        const onPage = this.regionsOnPage();
        // Overlapping areas would make "which area owns this balloon" depend on
        // area order rather than on where the operator drew, so the original
        // refuses them outright and so does this.
        if (onPage.some(r => rectsOverlap(r.rect, rect))) {
            notifyWarning('Areas cannot overlap. Draw this one clear of the others.');
            return;
        }
        const region = makeRegion(this.currentPage, rect, onPage.length);
        this.regions.push(region);
        this.selectedRegionId = region.regionId;
        this.dirty = true;
        this.renderAll();
        this.openAreaReorderDialog(region.regionId);
    }

    private deleteRegion(regionId: string) {
        const keep = this.regionsOnPage().filter(r => r.regionId !== regionId);
        this.regions = this.regions.filter(r => r.pageIndex !== this.currentPage)
            .concat(resequenceRegions(keep));
        if (this.selectedRegionId === regionId) this.selectedRegionId = null;
        this.dirty = true;
        this.renderAll();
    }

    private clearRegionsOnPage() {
        const n = this.regionsOnPage().length;
        if (!n) return;
        if (!confirm(`Remove all ${n} area${n === 1 ? '' : 's'} on page ${this.currentPage + 1}? The balloons themselves are not touched.`)) return;
        this.regions = this.regions.filter(r => r.pageIndex !== this.currentPage);
        this.selectedRegionId = null;
        this.dirty = true;
        this.renderAll();
    }

    /** Move an area earlier or later in the numbering order. */
    private moveRegion(regionId: string, delta: number) {
        const onPage = this.regionsOnPage();
        const i = onPage.findIndex(r => r.regionId === regionId);
        const j = i + delta;
        if (i < 0 || j < 0 || j >= onPage.length) return;
        [onPage[i], onPage[j]] = [onPage[j], onPage[i]];
        this.regions = this.regions.filter(r => r.pageIndex !== this.currentPage)
            .concat(resequenceRegions(onPage));
        this.dirty = true;
        this.renderAll();
    }

    /**
     * Renumber the whole drawing, page after page, continuing the count - One
     * Supply's re-sort. Each page is ordered as before: its areas by their own
     * rules, then reading order. Numbering used to restart at 1 on every page,
     * which gave a multi-page drawing several balloon 1s.
     */
    private handleRenumber() {
        if (!this.annotations.length) { notifyWarning('There are no balloons to renumber.'); return; }

        // Number categories: a child goes with its parent's category, so a
        // sub-number is never pulled away from the balloon it hangs off.
        const parentOf = new Map<string, BalloonAnnotation>();
        for (const a of this.annotations)
            if (!a.subNumber) parentOf.set(`${a.pageIndex}:${a.balloonNumber}`, a);
        const groupOf = (a: BalloonAnnotation) => categoryRank(this.categoryOrder,
            effectiveCategory(a.subNumber ? parentOf.get(`${a.pageIndex}:${a.balloonNumber}`) ?? a : a));
        const usesCategories = this.annotations.some(a => effectiveCategory(a) !== 'normal');

        const outcome = renumberAcrossPages(this.annotations, (page, onPage) => {
            const ordered = orderByRegions(
                onPage,
                this.regions.filter(r => r.pageIndex === page).sort((a, b) => a.orderIndex - b.orderIndex),
                {
                    grid: pageGridSystem(this.annotations, page),
                    pageHeightInches: this.pageHeightInchesFor(page),
                });
            return this.editorDefaults.gdtGroupSort ? groupGdtWithDimensions(ordered) : ordered;
        }, usesCategories ? groupOf : undefined);

        this.dirty = true;
        this.renderAll();
        notifySuccess(
            `Renumbered 1–${outcome.last}`
            + (outcome.pages > 1 ? ` across ${outcome.pages} pages` : '')
            + (outcome.children ? ` (plus ${outcome.children} sub-numbered)` : '')
            + '. Ctrl+Z to undo.');
    }

    /** Inches tall, for any page: measured on screen, or from the page image once loaded. */
    private pageHeightInchesFor(page: number): number | undefined {
        if (page === this.currentPage) return this.pageHeightInches();
        const size = this.pageSizes.get(page);
        return size ? size.h / 300 : undefined;
    }

    /** Measure a page image once, then redraw the list that was waiting on it. */
    private ensurePageSize(page: number) {
        if (this.pageSizes.has(page) || this.pageSizesPending.has(page)) return;
        const src = this.pages[page];
        if (!src) return;
        this.pageSizesPending.add(page);
        const img = new Image();
        img.onload = () => {
            this.pageSizesPending.delete(page);
            this.pageSizes.set(page, {w: img.naturalWidth, h: img.naturalHeight});
            clearTimeout(this.pageSizeRender);
            this.pageSizeRender = setTimeout(() => this.renderTable(), 60);
        };
        img.onerror = () => this.pageSizesPending.delete(page);
        img.src = src;
    }

    /**
     * Right-click menu for one area, matching the PyQt tool's
     * AreaSelectionManager.show_region_context_menu.
     *
     * Lives in every tool mode: an operator who has just drawn three areas
     * should not have to switch back to Select to configure them.
     */
    private showRegionMenu(regionId: string, clientX: number, clientY: number) {
        const region = this.regions.find(r => r.regionId === regionId);
        if (!region) return;
        this.closeRegionMenu();
        this.selectedRegionId = regionId;
        this.renderCanvas();

        const onPage = this.regionsOnPage();
        const i = onPage.findIndex(r => r.regionId === regionId);
        const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g,
            c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]!));

        const menu = document.createElement('div');
        menu.className = 'ab-context-menu';
        menu.innerHTML = `
          <div class="ab-context-title">
            <span class="ab-region-swatch" style="background:${region.color};"></span>${esc(region.label)}
          </div>
          <button data-act="sequence">Balloon order in this area&hellip;</button>
          <button data-act="areaorder" ${onPage.length < 2 ? 'disabled' : ''}
                  title="${onPage.length < 2 ? 'Needs at least two areas' : 'Choose which area is numbered first'}">Area order&hellip;</button>
          <div class="ab-context-sep"></div>
          <button data-act="up"   ${i <= 0 ? 'disabled' : ''}>Move earlier &uarr;</button>
          <button data-act="down" ${i < 0 || i >= onPage.length - 1 ? 'disabled' : ''}>Move later &darr;</button>
          <div class="ab-context-sep"></div>
          <button data-act="delete" class="danger">Delete this area</button>
          <button data-act="clear"  class="danger">Clear all areas on this page</button>`;

        menu.addEventListener('mousedown', e => e.stopPropagation());
        menu.addEventListener('contextmenu', e => e.preventDefault());
        menu.addEventListener('click', e => {
            const btn = (e.target as HTMLElement).closest('button') as HTMLButtonElement;
            if (!btn || btn.disabled) return;
            this.closeRegionMenu();
            switch (btn.getAttribute('data-act')) {
                case 'sequence':  this.openAreaReorderDialog(regionId); break;
                case 'areaorder': this.openAreaOrderDialog(); break;
                case 'up':        this.moveRegion(regionId, -1); break;
                case 'down':      this.moveRegion(regionId, 1); break;
                case 'delete':    this.deleteRegion(regionId); break;
                case 'clear':     this.clearRegionsOnPage(); break;
            }
        });

        // Positioned against the widget, not the page, because the canvas is
        // transformed by pan/zoom - a menu placed inside it would be scaled
        // and panned along with the drawing.
        const host = this.container.getBoundingClientRect();
        menu.style.left = `${clientX - host.left}px`;
        menu.style.top = `${clientY - host.top}px`;
        this.container.appendChild(menu);
        this.regionMenuEl = menu;

        // Nudge back inside if it would hang off the right or bottom edge.
        const box = menu.getBoundingClientRect();
        if (box.right > host.right)
            menu.style.left = `${clientX - host.left - box.width}px`;
        if (box.bottom > host.bottom)
            menu.style.top = `${clientY - host.top - box.height}px`;
    }

    private closeRegionMenu() {
        this.regionMenuEl?.remove();
        this.regionMenuEl = null;
    }

    /**
     * Reorder the areas themselves - which one is numbered first.
     *
     * The PyQt RegionOrderDialog is a drag-to-reorder list; this is the same
     * list with drag plus keyboard-reachable up/down buttons, since a
     * drag-only control is unusable without a mouse.
     */
    private openAreaOrderDialog() {
        const onPage = this.regionsOnPage();
        if (onPage.length < 2) {
            notifyWarning('Draw at least two areas before ordering them.');
            return;
        }
        const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g,
            c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]!));

        let order = onPage.map(r => r.regionId);

        const overlay = document.createElement('div');
        overlay.className = 'ab-modal-overlay';
        overlay.innerHTML = `
          <div class="ab-modal" role="dialog" aria-label="Area order" style="width:380px;">
            <div class="ab-modal-header">Which area is numbered first?</div>
            <div class="ab-modal-body">
              <p class="ab-modal-note">Drag to reorder, or use the arrows. The area at the
                 top of the list is numbered first, and its balloons take the lowest numbers.</p>
              <ul id="ab-area-order" class="ab-order-list"></ul>
            </div>
            <div class="ab-modal-footer">
              <button id="ab-modal-cancel" class="ab-btn">Cancel</button>
              <button id="ab-modal-ok" class="ab-btn ab-btn-primary">Apply and renumber</button>
            </div>
          </div>`;

        const listEl = overlay.querySelector('#ab-area-order') as HTMLElement;
        const byId = new Map(onPage.map(r => [r.regionId, r]));

        const paint = () => {
            listEl.innerHTML = order.map((id, idx) => {
                const r = byId.get(id)!;
                return `<li draggable="true" data-id="${id}">
                    <span class="ab-order-pos">${idx + 1}</span>
                    <span class="ab-region-swatch" style="background:${r.color};"></span>
                    <span class="ab-order-name">${esc(r.label)}</span>
                    <button data-move="-1" ${idx === 0 ? 'disabled' : ''} title="Move up">&uarr;</button>
                    <button data-move="1" ${idx === order.length - 1 ? 'disabled' : ''} title="Move down">&darr;</button>
                  </li>`;
            }).join('');
        };

        const move = (id: string, delta: number) => {
            const i = order.indexOf(id), j = i + delta;
            if (i < 0 || j < 0 || j >= order.length) return;
            [order[i], order[j]] = [order[j], order[i]];
            paint();
        };

        listEl.addEventListener('click', e => {
            const btn = (e.target as HTMLElement).closest('button[data-move]') as HTMLButtonElement;
            if (!btn || btn.disabled) return;
            move(btn.closest('li')!.getAttribute('data-id')!, Number(btn.getAttribute('data-move')));
        });

        let dragId: string | null = null;
        listEl.addEventListener('dragstart', e => {
            dragId = (e.target as HTMLElement).closest('li')?.getAttribute('data-id') ?? null;
            (e as DragEvent).dataTransfer!.effectAllowed = 'move';
        });
        listEl.addEventListener('dragover', e => {
            e.preventDefault();
            const overId = (e.target as HTMLElement).closest('li')?.getAttribute('data-id');
            if (!dragId || !overId || overId === dragId) return;
            const from = order.indexOf(dragId);
            const to = order.indexOf(overId);
            order.splice(to, 0, ...order.splice(from, 1));
            paint();
        });
        listEl.addEventListener('dragend', () => { dragId = null; });

        const close = () => overlay.remove();
        overlay.querySelector('#ab-modal-cancel')?.addEventListener('click', close);
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
        overlay.querySelector('#ab-modal-ok')?.addEventListener('click', () => {
            const reordered = order.map(id => byId.get(id)!);
            this.regions = this.regions.filter(r => r.pageIndex !== this.currentPage)
                .concat(resequenceRegions(reordered));
            this.dirty = true;
            close();
            this.handleRenumber();
        });

        this.container.appendChild(overlay);
        paint();
    }

    /**
     * Ask how this area's balloons should be numbered.
     *
     * Mirrors AreaReorderDialog: the same nine modes in the same two groups,
     * and the start-angle box enabled only for the sweep that uses it.
     */
    private openAreaReorderDialog(regionId: string) {
        const region = this.regions.find(r => r.regionId === regionId);
        if (!region) return;

        const inside = this.annotations.filter(
            a => a.pageIndex === region.pageIndex
                && regionContains(region, a, this.pageHeightInches()));

        const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g,
            c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]!));

        const overlay = document.createElement('div');
        overlay.className = 'ab-modal-overlay';
        overlay.innerHTML = `
          <div class="ab-modal" role="dialog" aria-label="Area numbering">
            <div class="ab-modal-header">
              <span class="ab-region-swatch" style="background:${region.color};"></span>
              ${esc(region.label)} &mdash; how should these balloons be numbered?
            </div>
            <div class="ab-modal-body">
              <p class="ab-modal-note">${inside.length} balloon${inside.length === 1 ? '' : 's'} inside this area.
                ${inside.length < 2 ? '<b>Fewer than two, so ordering will have no visible effect.</b>' : ''}</p>
              ${AREA_SORT_GROUPS.map(group => `
                <fieldset class="ab-modal-group">
                  <legend>${esc(group.title)}</legend>
                  ${group.modes.map(m => `
                    <label class="ab-modal-radio" title="${esc(m.hint)}">
                      <input type="radio" name="ab-sort-mode" value="${m.key}"
                             ${region.sortMode === m.key ? 'checked' : ''} />
                      <span><b>${esc(m.label)}</b><small>${esc(m.hint)}</small></span>
                    </label>`).join('')}
                </fieldset>`).join('')}
              <div class="ab-modal-row">
                <label for="ab-start-angle">Start angle</label>
                <input id="ab-start-angle" type="number" min="0" max="359" step="1"
                       class="ab-input ab-input-mini" value="${region.startAngle}" />
                <small>degrees clockwise, 0&deg; = straight up. Used only by
                       &ldquo;Clockwise from a set angle&rdquo;.</small>
              </div>
            </div>
            <div class="ab-modal-footer">
              <button id="ab-modal-cancel" class="ab-btn">Cancel</button>
              <button id="ab-modal-ok" class="ab-btn ab-btn-primary">Apply and renumber</button>
            </div>
          </div>`;

        const close = () => overlay.remove();
        const angleEl = () => overlay.querySelector('#ab-start-angle') as HTMLInputElement;
        const checked = () => (overlay.querySelector(
            'input[name="ab-sort-mode"]:checked') as HTMLInputElement)?.value as AreaSortMode;

        const syncAngle = () => {
            const on = checked() === 'polar_sweep';
            angleEl().disabled = !on;
            angleEl().closest('.ab-modal-row')?.classList.toggle('disabled', !on);
        };
        overlay.querySelectorAll('input[name="ab-sort-mode"]').forEach(
            el => el.addEventListener('change', syncAngle));

        overlay.querySelector('#ab-modal-cancel')?.addEventListener('click', close);
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
        overlay.querySelector('#ab-modal-ok')?.addEventListener('click', () => {
            region.sortMode = normalizeSortMode(checked());
            const a = parseInt(angleEl().value, 10);
            region.startAngle = Number.isFinite(a) ? ((a % 360) + 360) % 360 : 0;
            close();
            this.handleRenumber();
        });

        this.container.appendChild(overlay);
        syncAngle();
    }

    // ─── GD&T palette ────────────────────────────────────────────────────

    /**
     * Show the symbol palette for the focused Symbol field.
     *
     * Anchored bottom-right of the drawing, not bottom-left as in DS_ERP: the
     * balloon editor now lives in the LEFT rail, so a palette on that side
     * would sit on top of the field it is feeding.
     */
    private openGdtPalette(field: HTMLTextAreaElement, annId: string) {
        // Already open on THIS field: leave it alone. Clicking a symbol calls
        // field.focus() to put the caret back, which re-fires this handler -
        // rebuilding here would reset the selection, the filter, the scroll
        // position and the footer on every single insert.
        if (this.gdtPaletteEl && this.gdtPaletteField === field
            && this.gdtPaletteEl.isConnected)
            return;

        // A different balloon means a different textarea: renderProperties
        // replaces the field on every selection, so a palette held over from
        // the last one would be writing into a node no longer in the document.
        this.closeGdtPalette();
        this.gdtPaletteField = field;
        this.gdtPaletteEl = buildGdtPalette(
            field,
            value => {
                this.updateAnnotation(annId, {content: value});
                // updateAnnotation re-renders the table and canvas but not the
                // property panel, so the field the operator is typing in keeps
                // its caret and the palette keeps its target.
            },
            () => this.closeGdtPalette());
        this.container.appendChild(this.gdtPaletteEl);
    }

    private closeGdtPalette() {
        this.gdtPaletteEl?.remove();
        this.gdtPaletteEl = null;
        this.gdtPaletteField = null;
    }

    // ─── Export ──────────────────────────────────────────────────────────

    /**
     * Download the drawing with every balloon drawn on it.
     *
     * Annotates the ORIGINAL PDF where one is available, so the result keeps
     * its vector text and stays readable at any zoom. With no source it falls
     * back to building a PDF from the rendered page images, which is a picture
     * of the drawing rather than the drawing - usable, but worth saying.
     *
     * Balloon positions come from the same force-directed solver the canvas
     * uses, so the export matches what is on screen rather than re-deriving a
     * layout that would place markers somewhere else.
     */
    /**
     * The balloon list as a spreadsheet, ported from One Supply.
     *
     * Server-side, unlike Export PDF beside it, and the difference is not
     * arbitrary: the PDF needs the rendered pages and the solved balloon
     * positions, which only exist in this widget, while the spreadsheet needs
     * nothing but the rows. Building it here would mean carrying a
     * half-megabyte xlsx writer in the workspace bundle to reproduce a query
     * the server can already answer.
     *
     * The cost of that is this method's one complication: the server exports
     * what is SAVED, so unsaved edits would silently not appear. Hence the
     * prompt rather than a quiet stale download.
     */
    private async handleExportExcel() {
        if (!this.annotations.length
            && !confirm('There are no balloons on this drawing. Export an empty list anyway?'))
            return;

        if (this.dirty) {
            if (!confirm('You have unsaved changes. The spreadsheet is built from what '
                + 'is saved, so those changes will not appear in it.\n\n'
                + 'Save now and then export?'))
                return;
            await this.handleSave();
            // handleSave reports its own failure; exporting anyway would hand
            // over a file that silently disagrees with the screen.
            if (this.dirty) return;
        }

        // A plain navigation, not fetch-then-blob: the endpoint is a GET that
        // answers with Content-Disposition, so the browser's own download
        // handles naming, progress and cancellation. resolveServiceUrl rather
        // than a literal "/Services/..." so this still works if the app is ever
        // hosted under a path prefix.
        window.location.href = resolveServiceUrl(
            'Costing/CostingPartBalloons/ExportExcel'
            + `?costingPartId=${encodeURIComponent(String(this.costingPartId))}`);
    }

    private async handleExportPdf() {
        if (this.isExporting) return;
        if (!this.pages.length) {
            notifyWarning('There is nothing to export - this document has no pages.');
            return;
        }
        if (!this.annotations.length
            && !confirm('There are no balloons on this drawing. Export it anyway?'))
            return;

        // One Supply's export filter: leave reference or basic balloons out,
        // and print quantities - asked each time when the option is on.
        let pdfOptions = loadPdfExportOptions();
        if (pdfOptions.askBeforeExport) {
            const chosen = await pdfExportDialog(this.container, pdfOptions, {
                reference: this.annotations.filter(isReferenceBalloon).length,
                theoretical: this.annotations.filter(isTheoreticalBalloon).length,
            });
            if (!chosen) return;
            pdfOptions = chosen;
            if (canEditShopSettings()) savePdfExportOptions(chosen);
        }
        const exported = filterForExport(this.annotations, pdfOptions);

        this.isExporting = true;
        this.renderToolbar();
        try {
            // Solve every page, not just the visible one: the export covers the
            // whole document and an unsolved page would fall back to raw anchor
            // positions, so its balloons would sit differently from the rest.
            const solved = new Map<string, { x: number; y: number }>();
            const radius = this.computeBalloonSizePct() / 2;
            for (let p = 0; p < this.pages.length; p++)
                for (const [id, pos] of this.fdLayout.solve(exported.list, p, radius))
                    solved.set(id, pos);

            let file: File;
            if (this.sourceUrl) {
                const res = await fetch(this.sourceUrl);
                if (!res.ok) throw new Error(`could not read the drawing (HTTP ${res.status})`);
                file = new File([await res.blob()], this.sourceName,
                    {type: 'application/pdf'});
            } else {
                // No source document: exportToAnnotatedPdf rebuilds from the
                // page images when the file is not a PDF, so hand it a name
                // that says so rather than a PDF it cannot parse.
                notifyWarning('Exporting from the page images - the source PDF was not '
                    + 'available, so text in the result will not be selectable.');
                file = new File([], 'drawing.jpg', {type: 'image/jpeg'});
            }

            await exportToAnnotatedPdf(
                file, exported.list, this.pages,
                this.balloonSizeMultiplier, solved, [], {
                    styleOf: a => resolveBalloonStyle(a, this.shopStyle),
                    suffixOf: pdfOptions.showQuantity ? a => formatQuantityRange(a.quantity) : undefined,
                });

            notifySuccess(`Exported ${exported.list.length} balloon`
                + `${exported.list.length === 1 ? '' : 's'}`
                + (exported.hidden ? ` (${exported.hidden} left out)` : '') + ' across '
                + `${this.pages.length} page${this.pages.length === 1 ? '' : 's'}.`);
        } catch (e: any) {
            console.error('PDF export failed', e);
            notifyError(e?.message
                ? `Could not export the PDF: ${e.message}`
                : 'Could not export the PDF.');
        } finally {
            this.isExporting = false;
            this.renderToolbar();
        }
    }

    // ─── Auto-recognition ────────────────────────────────────────────────

    /**
     * Queue recognition for this part.
     *
     * Goes through CostingParts/Rerun rather than calling RPA\API from the
     * browser. That endpoint already clears the previous balloons, guards
     * against a run that is live or queued, and publishes to the same queue
     * the consumer drains - and it keeps the middleware's API key on the
     * server, where the browser cannot read it.
     *
     * Recognition runs on the CONVERTED page images the consumer produced, so
     * it works from what is stored, not from what is on screen.
     */
    /**
     * @param pageNumber 1-based page to redo, or undefined for the whole part.
     */
    private async handleAutoBalloon(pageNumber?: number) {
        const scope = pageNumber
            ? `page ${pageNumber}`
            : `all ${this.pages.length} page${this.pages.length === 1 ? '' : 's'}`;

        // The re-run deactivates the automatic balloons in scope. Unsaved
        // edits are in memory only, so they would be quietly lost against a
        // set of rows that no longer exists.
        if (this.dirty && !confirm(
            'You have unsaved balloon changes.\n\n'
            + 'Running recognition replaces the automatic balloons on '
            + `${scope}, and your unsaved edits are discarded when it starts - `
            + 'on every page, not just this one, because the new balloons are '
            + 'read back for the whole drawing. Continue anyway?'))
            return;

        if (!confirm(
            `Run recognition on ${scope}?\n\n`
            + 'Every automatically detected balloon there is replaced. Balloons you '
            + 'drew by hand are kept, and ones you deleted stay deleted.'
            + (pageNumber ? '\n\nOther pages are not touched.' : '')
            + '\n\nIt runs in the background - the drawing stays usable, and the new '
            + 'balloons appear once it finishes.'))
            return;

        const btn = this.toolbarEl.querySelector(
            pageNumber ? '#btn-auto-page' : '#btn-auto') as HTMLButtonElement;
        if (btn) btn.disabled = true;
        try {
            const res = await CostingPartsService.Rerun({
                CostingPartId: this.costingPartId,
                Stage: RerunStage.Ballooning,
                Force: false,
                PageNumber: pageNumber,
                // One Supply's "recognise all pages, skipping pages already done".
                SkipDonePages: !pageNumber && this.editorDefaults.skipDonePages,
            });

            // The edits are gone as of now, so stop claiming they are pending.
            //
            // Not housekeeping: reloadFromServer refuses to run while this flag
            // is set, precisely so a live reload cannot discard unsaved work.
            // But the operator has just been asked about that work and said go
            // ahead, and the endpoint has already deactivated the rows it was
            // against - so leaving the flag set made the widget refuse the very
            // results this run produces. The balloons arrived in the database,
            // the canvas ignored them, and they only appeared once the drawing
            // was closed and reopened.
            this.dirty = false;

            notifySuccess(res?.Message
                || 'Recognition queued. The balloons will appear when it finishes.');
        } catch (e: any) {
            // AlreadyRunning and AlreadyQueued are the endpoint's own guards
            // against two consumers writing the same part; they are worth
            // saying plainly rather than as a red failure.
            const msg = e?.responseJSON?.Error?.Message ?? e?.message ?? '';
            if (/already/i.test(msg)) notifyWarning(msg);
            else {
                console.error('Auto Balloon failed', e);
                notifyError(msg || 'Could not queue recognition for this part.');
            }
        } finally {
            this.renderToolbar();
        }
    }

    // ─── Always-filter keywords ──────────────────────────────────────────

    /**
     * Edit the always-filter phrases, and clear out the balloons they catch.
     *
     * The list is an application setting, so editing it here changes it for
     * every part. Removing balloons is a separate, explicit button rather than
     * something Save does quietly - the same list can be right on one drawing
     * and too broad on the next, and the operator has to see what it caught.
     */
    /**
     * The Default Tol dialog - One Supply's default_tolerance_dialog: custom
     * schemes, ISO 2768-1 and ISO 2768-2, the exclusions, Apply and Update
     * applied. The editor is BallooningToleranceDialog, the rules are
     * BallooningTolerance; this only hands it the balloons and writes back.
     */
    private openDefaultToleranceDialog() {
        openToleranceDialog({
            container: this.container,
            annotations: () => this.annotations.map(a => ({
                id: a.id, content: a.content, upperTol: a.upperTol, lowerTol: a.lowerTol,
                isNote: a.isNote, isDatum: a.isDatum, toleranceStandard: a.toleranceStandard,
            })),
            commit: (proposals, kind) => {
                const byId = new Map(proposals.map(p => [p.id, p]));
                this.annotations = this.annotations.map(a => {
                    const p = byId.get(a.id);
                    return p ? {...a, upperTol: p.upper, lowerTol: p.lower, toleranceStandard: p.standard} : a;
                });
                this.dirty = true;
                this.renderAll();
                const n = proposals.length, s = n === 1 ? '' : 's';
                notifySuccess(kind === 'apply'
                    ? `Applied a default tolerance to ${n} balloon${s}. Save to keep it.`
                    : `Recalculated ${n} balloon${s} from ${proposals[0].standard}. Save to keep it.`);
            },
        });
    }

    private openKeywordFilterDialog() {
        const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g,
            c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]!));

        let keywords = loadAlwaysFilterKeywords();

        const overlay = document.createElement('div');
        overlay.className = 'ab-modal-overlay';
        overlay.innerHTML = `
          <div class="ab-modal" role="dialog" aria-label="Always-filter keywords" style="width:520px;">
            <div class="ab-modal-header">Always-filter keywords</div>
            <div class="ab-modal-body">
              <p class="ab-modal-note">Matched anywhere in a balloon's text, ignoring case and
                 extra spaces. Notes are never filtered. Applies to every part, not just this one.</p>
              <div class="ab-modal-row">
                <input id="ab-kw-new" class="ab-input" style="flex:1;"
                       placeholder="Add a word or phrase, e.g. FOR REFERENCE ONLY" />
                <button id="ab-kw-add" class="ab-btn">Add</button>
              </div>
              <ul id="ab-kw-list" class="ab-kw-list"></ul>
              <div id="ab-kw-hits" class="ab-kw-hits"></div>

              ${/* Structural rules, as opposed to the phrase list above. These
                    hold on any drawing regardless of what anyone typed, so
                    they are switches rather than entries. Off by default: they
                    remove balloons the model DID find. */ ''}
              <details class="ab-props-more" ${this.structuralOpen ? 'open' : ''}>
                <summary>By kind, not by phrase</summary>
                <label class="ab-label ab-check">
                  <input id="ab-f-ref" type="checkbox" />
                  Reference dimensions &mdash; a value wholly in brackets, <code>(1.250)</code>.
                  Derived from other dimensions and not inspected.</label>
                <label class="ab-label ab-check">
                  <input id="ab-f-eng" type="checkbox" />
                  English noise &mdash; prose OCR scraped off the sheet.
                  <code>THRU</code>, <code>TYP</code> and thread callouts are kept.</label>
                <label class="ab-label ab-check">
                  <input id="ab-f-datum" type="checkbox" />
                  Datum features &mdash; the &#9650; marking a surface AS a datum.
                  Nothing measures it. A control frame that <em>cites</em> datums is kept.</label>
                <div id="ab-f-hits" class="ab-kw-hits"></div>
              </details>
            </div>
            <div class="ab-modal-footer">
              <button id="ab-kw-restore" class="ab-btn" title="Back to the phrases this ships with">Restore defaults</button>
              <span style="flex:1;"></span>
              <button id="ab-modal-cancel" class="ab-btn">Cancel</button>
              <button id="ab-kw-remove" class="ab-btn ab-btn-danger">Save &amp; remove matches</button>
              <button id="ab-modal-ok" class="ab-btn ab-btn-primary">Save</button>
            </div>
          </div>`;

        const listEl = overlay.querySelector('#ab-kw-list') as HTMLElement;
        const hitsEl = overlay.querySelector('#ab-kw-hits') as HTMLElement;
        const newEl = overlay.querySelector('#ab-kw-new') as HTMLInputElement;
        const removeBtn = overlay.querySelector('#ab-kw-remove') as HTMLButtonElement;

        let structural = loadDimensionFilters();
        const refEl = overlay.querySelector('#ab-f-ref') as HTMLInputElement;
        const engEl = overlay.querySelector('#ab-f-eng') as HTMLInputElement;
        const datumEl = overlay.querySelector('#ab-f-datum') as HTMLInputElement;
        const fHitsEl = overlay.querySelector('#ab-f-hits') as HTMLElement;
        refEl.checked = structural.reference;
        engEl.checked = structural.englishNoise;
        datumEl.checked = structural.datum;

        const hits = () => findFiltered(
            this.annotations.map(a => ({id: a.id, content: a.content, isNote: a.isNote})),
            keywords);

        const structuralHits = () => findStructuralMatches(
            this.annotations.map(a => ({
                id: a.id, content: a.content, isNote: a.isNote, isDatum: a.isDatum,
            })), structural);

        const paintStructural = () => {
            structural = {...structural, reference: refEl.checked, englishNoise: engEl.checked,
                          datum: datumEl.checked};
            const h = structuralHits();
            // Salvage and removal are reported apart because they are different
            // decisions: one loses a balloon, the other only trims its text.
            const remove = h.filter(x => !x.salvaged);
            const salvage = h.filter(x => x.salvaged);
            fHitsEl.innerHTML = h.length
                ? `<b>${remove.length}</b> to remove`
                  + (salvage.length
                      ? `, <b>${salvage.length}</b> whose text can be trimmed instead
                         &mdash; e.g. ${salvage.slice(0, 3)
                             .map(x => `<span>${esc(x.salvaged!)}</span>`).join(' ')}`
                      : '')
                : (refEl.checked || engEl.checked || datumEl.checked
                    ? 'Nothing on this part matches these rules.'
                    : '');
        };

        const paint = () => {
            listEl.innerHTML = keywords.length
                ? keywords.map(k => `<li>
                     <span>${esc(k)}</span>
                     <button data-kw="${esc(k)}" title="Remove this phrase">&times;</button>
                   </li>`).join('')
                : `<li class="ab-kw-empty">No phrases. Nothing will be filtered.</li>`;

            const h = hits();
            // Naming the phrase that caught each balloon is the difference
            // between a reviewable rule and an unexplainable disappearance.
            const byKeyword = new Map<string, number>();
            for (const x of h) byKeyword.set(x.keyword, (byKeyword.get(x.keyword) ?? 0) + 1);
            hitsEl.innerHTML = h.length
                ? `<b>${h.length}</b> balloon${h.length === 1 ? '' : 's'} across all pages match:
                   ${[...byKeyword.entries()].sort((a, b) => b[1] - a[1])
                       .map(([k, n]) => `<span>${esc(k)} &mdash; ${n}</span>`).join('')}`
                : `No balloon on this part matches any of these phrases.`;
            removeBtn.disabled = !h.length;
        };

        const add = () => {
            const v = normalizeKeyword(newEl.value);
            if (!v) return;
            if (keywords.some(k => k.toLowerCase() === v.toLowerCase())) {
                notifyWarning(`"${v}" is already on the list.`);
                newEl.select();
                return;
            }
            keywords = sortKeywordList([...keywords, v]);
            newEl.value = '';
            paint();
        };

        overlay.querySelector('#ab-kw-add')?.addEventListener('click', add);
        newEl.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); add(); }
        });
        listEl.addEventListener('click', e => {
            const btn = (e.target as HTMLElement).closest('button[data-kw]');
            if (!btn) return;
            const kw = btn.getAttribute('data-kw');
            keywords = keywords.filter(k => k !== kw);
            paint();
        });
        overlay.querySelector('#ab-kw-restore')?.addEventListener('click', () => {
            keywords = sortKeywordList(DEFAULT_ALWAYS_FILTER_KEYWORDS);
            paint();
        });
        [refEl, engEl, datumEl].forEach(el => el.addEventListener('change', paintStructural));
        overlay.querySelector('.ab-props-more')?.addEventListener('toggle', e =>
            this.structuralOpen = (e.target as HTMLDetailsElement).open);
        paintStructural();

        const close = () => overlay.remove();
        overlay.querySelector('#ab-modal-cancel')?.addEventListener('click', close);
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

        overlay.querySelector('#ab-modal-ok')?.addEventListener('click', () => {
            saveAlwaysFilterKeywords(keywords);
            saveDimensionFilters(structural);
            close();
            notifySuccess(`Saved ${keywords.length} filter phrase${keywords.length === 1 ? '' : 's'}.`);
        });

        removeBtn.addEventListener('click', () => {
            const h = hits();
            const sh = structuralHits();
            const toRemove = sh.filter(x => !x.salvaged);
            const toTrim = sh.filter(x => x.salvaged);
            const total = h.length + toRemove.length;
            if (!total && !toTrim.length) return;

            const parts = [`Remove ${total} balloon${total === 1 ? '' : 's'}`];
            if (toTrim.length)
                parts.push(`and trim the text of ${toTrim.length} more to just the dimension`);
            if (!confirm(parts.join(' ') + '?\n\n'
                + `Removed balloons are kept as removed, so a later re-run of recognition `
                + `will not bring them back.`))
                return;
            saveAlwaysFilterKeywords(keywords);
            saveDimensionFilters(structural);

            // Trimming happens first: a salvage keeps the balloon and only
            // shortens its text, so it must not be caught by the removal below.
            if (toTrim.length) {
                const trims = new Map(toTrim.map(x => [x.id, x.salvaged!]));
                this.annotations = this.annotations.map(a =>
                    trims.has(a.id) ? {...a, content: trims.get(a.id)!} : a);
            }

            const doomed = new Set([...h.map(x => x.item.id), ...toRemove.map(x => x.id)]);
            const removed = this.annotations.filter(a => doomed.has(a.id));
            // Pushed onto removedAnnotations, not dropped: a save records the
            // removal so recognition does not re-add them next time.
            this.removedAnnotations.push(...removed);
            this.annotations = this.annotations.filter(a => !doomed.has(a.id));
            if (this.selectedId && doomed.has(this.selectedId)) this.selectedId = null;
            // The multi-selection has to be pruned too, or the batch panel
            // keeps counting balloons that no longer exist.
            this.selectedIds = new Set([...this.selectedIds].filter(id => !doomed.has(id)));
            this.dirty = true;
            close();
            this.renderAll();
            notifySuccess(`Removed ${removed.length} filtered balloon${removed.length === 1 ? '' : 's'}`
                + (toTrim.length ? `, trimmed ${toTrim.length}.` : '.'));
        });

        this.container.appendChild(overlay);
        paint();
        newEl.focus();
    }

    /**
     * Clear balloons and masks. One Supply's clear_scope: on a multi-page
     * drawing the operator picks this page or every page; a single page asks
     * only to confirm. Undo (Ctrl+Z) brings either back.
     */
    private async handleClearPage() {
        const page = this.currentPage;
        const onPage = this.annotations.filter(a => a.pageIndex === page).length;
        const total = this.annotations.length;
        const masksOnPage = this.masks.some(m => m.pageIndex === page);
        if (!total && !this.masks.length) return;

        const multiPage = this.pages.length > 1;
        const scope = multiPage
            ? await clearScopeDialog(this.container, {page: page + 1, onPage, total, pages: this.pages.length})
            : (confirm(`Remove all ${onPage} balloons and any masks on this page?`) ? 'page' : null);
        if (!scope) return;
        if (scope === 'page' && !onPage && !masksOnPage) return;

        const hit = (p: number) => scope === 'all' || p === page;
        this.removedAnnotations.push(...this.annotations.filter(a => hit(a.pageIndex)));
        const removed = this.annotations.filter(a => hit(a.pageIndex)).length;
        this.annotations = this.annotations.filter(a => !hit(a.pageIndex));
        this.masks = this.masks.filter(m => !hit(m.pageIndex));
        this.selectedId = null;
        this.selectedIds.clear();
        this.dirty = true;
        this.renderAll();
        notifySuccess(`Removed ${removed} balloon${removed === 1 ? '' : 's'}`
            + (scope === 'all' ? ' from every page' : ` from page ${page + 1}`) + '. Ctrl+Z to undo.');
    }

    // ─── Property editor ─────────────────────────────────────────────────

    private renderProperties() {
        // More than one selected is a different job with different rules, so it
        // gets its own panel rather than a mode flag threaded through this one.
        if (this.selectedIds.size > 1) {
            this.renderBatchProperties();
            return;
        }

        const ann = this.annotations.find(a => a.id === this.selectedId);
        if (!ann) {
            this.propertyEditorEl.innerHTML = `
                <div class="ab-panel-header"><div class="ab-panel-title">Balloon</div></div>
                <div class="ab-panel-content"><p class="ab-panel-subtitle">Select a balloon to edit it.
                   Ctrl-click or shift-click for several.</p></div>`;
            return;
        }

        const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g,
            c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]!));

        this.propertyEditorEl.innerHTML = `
            <div class="ab-panel-header">
                <div class="ab-panel-title">Balloon ${esc(formatBalloonNumber(ann, this.subSeparator))}${
                    this.viewTitleOf(ann) ? `<span class="ab-vl-tag" title="This balloon is in ${esc(this.viewTitleOf(ann)!)}">${esc(this.viewTitleOf(ann)!)}</span>` : ''}</div>
                <button id="ab-audit" class="ab-btn ${ann.audited ? 'ab-btn-audited' : ''}"
                        title="${ann.audited
                            ? esc(`Audited${ann.auditedBy ? ' by ' + ann.auditedBy : ''}${ann.auditedOn ? ' on ' + new Date(ann.auditedOn).toLocaleString() : ''}. Click to clear.`)
                            : 'Mark reviewed and go to the next unaudited balloon (F2)'}">
                    ${ann.audited ? '&#10003; Audited' : 'Audit (F2)'}</button>
                <button id="ab-del" class="ab-btn ab-btn-danger ab-btn-icon" title="Delete this balloon">${getIcon('trash')}</button>
            </div>
            <div class="ab-panel-content ab-props">
                ${/* One Supply's screenshot preview: the dimension as drawn,
                      turned the way it reads. Wheel zooms. */ ''}
                <div class="ab-crop-preview">
                    <div class="ab-crop-stage" id="ab-crop-stage">${this.cropPreviewHtml(ann)}</div>
                    <div class="ab-crop-tools">
                        <button class="ab-btn ab-btn-icon" data-rot="-90" title="Turn left 90°">&#8634;</button>
                        <button class="ab-btn ab-btn-icon" data-rot="-15" title="-15°">-15</button>
                        <button class="ab-btn ab-btn-icon" data-rot="15" title="+15°">+15</button>
                        <button class="ab-btn ab-btn-icon" data-rot="90" title="Turn right 90°">&#8635;</button>
                        <button class="ab-btn ab-btn-icon" data-rot="0" title="Reset">0°</button>
                        <span class="ab-crop-angle">${ann.cropRotation ?? 0}°</span>
                    </div>
                </div>
                ${/* Stacked in the order an inspector reads a characteristic:
                      what it is, then how much it may vary, then how many. The
                      old two-column grids were laid out for a wide tray and are
                      unreadable now the panel lives in a 300px rail. */ ''}
                <div class="ab-form-group">
                    <label class="ab-label" for="ab-content">Symbol / text</label>
                    <textarea id="ab-content" class="ab-textarea ab-symbol" rows="2">${esc(ann.content)}</textarea>
                    <select id="ab-insert" class="ab-select ab-symbol ab-insert"
                            title="Insert a symbol at the cursor; a GD&amp;T symbol also sets the characteristic">
                        <option value="">Insert symbol&hellip;</option>
                        ${['⌀', '±', '°', '⊥', '//', '∠', '⌴', '⏤', '▱', '○', '⌖', '⌭', '⌒', '⌓', '◎', '⌯', '↗', '⌰', 'R', 'Ra', 'Rz', '√', '▲']
                            .map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}
                    </select>
                </div>
                ${/* What the text MEANS, from the shared vocabulary, as opposed
                      to the text itself above. Recognition fills this in where
                      it can; the operator corrects it here when it read the
                      glyph wrong, which is most of the value of the list. */ ''}
                <div class="ab-form-group">
                    <label class="ab-label">Characteristic</label>
                    <div class="ab-feature-editor"></div>
                </div>
                ${/* What measures it. Sits next to the characteristic because
                      the two are read together: a position tolerance checked
                      on a CMM is a different job from one checked with a pin
                      gauge. */ ''}
                <div class="ab-form-group">
                    <label class="ab-label">Inspection tool
                        <a href="#" id="ab-tool-default" class="ab-label-link" title="Choose the tool new balloons start with">default&hellip;</a></label>
                    <div class="ab-tool-editor"></div>
                </div>
                ${/* Lower before upper, reading downwards, so the pair sits the
                      way a tolerance is written on the drawing. */ ''}
                <div class="ab-form-row">
                    <div class="ab-form-group">
                        <label class="ab-label" for="ab-lower">Lower tol</label>
                        <input id="ab-lower" class="ab-input" value="${esc(ann.lowerTol)}" />
                    </div>
                    <div class="ab-form-group">
                        <label class="ab-label" for="ab-upper">Upper tol</label>
                        <input id="ab-upper" class="ab-input" value="${esc(ann.upperTol)}" />
                    </div>
                </div>
                ${/* Where the pair came from - One Supply's tolerance-standard
                      box. Choosing a scheme recalculates this one balloon;
                      typing in either field above sets it back to "typed". */ ''}
                <div class="ab-form-group">
                    <label class="ab-label" for="ab-tolstd"
                           title="The general tolerance this pair came from. Pick one to recalculate this balloon from it. A tolerance typed by hand shows as Typed, and Update applied never touches it.">Tolerance from</label>
                    <select id="ab-tolstd" class="ab-select">${this.toleranceStandardOptions(ann)}</select>
                    <div id="ab-tol-status" class="ab-tol-status"></div>
                </div>
                <div class="ab-form-row">
                    <div class="ab-form-group">
                        <label class="ab-label" for="ab-qty" title="How many identical features this balloon covers: 4, 4x or (1-4)">Quantity</label>
                        <input id="ab-qty" class="ab-input" placeholder="4, 4x, (1-4)" value="${esc(formatQuantityRange(ann.quantity))}" />
                    </div>
                    <div class="ab-form-group">
                        <label class="ab-label" for="ab-feature" title="A basic or reference dimension carries no tolerance">Dimension feature</label>
                        <select id="ab-feature" class="ab-select">${DIMENSION_FEATURES.map(f =>
                            `<option value="${f.key}" ${(ann.dimensionFeature ?? '') === f.key ? 'selected' : ''}>${f.label}</option>`).join('')}</select>
                    </div>
                </div>
                <div class="ab-form-row">
                    <div class="ab-form-group">
                        <label class="ab-label" for="ab-category">Number category
                            <a href="#" id="ab-category-order" class="ab-label-link" title="The order Renumber walks the categories">order&hellip;</a></label>
                        <select id="ab-category" class="ab-select">${NUMBER_CATEGORIES.map(c =>
                            `<option value="${c.key}" ${effectiveCategory(ann) === c.key ? 'selected' : ''}>${c.label}</option>`).join('')}</select>
                    </div>
                    <div class="ab-form-group">
                        <label class="ab-label" for="ab-export" title="What a report shows for this balloon">Export as</label>
                        <select id="ab-export" class="ab-select">${EXPORT_MODES.map(m =>
                            `<option value="${m.key}" ${(ann.exportMode || 'text') === m.key ? 'selected' : ''}>${m.label}</option>`).join('')}</select>
                    </div>
                </div>
                <div class="ab-form-group">
                    <label class="ab-label" for="ab-arrow">Arrow</label>
                    <select id="ab-arrow" class="ab-select">
                        <option value="" ${ann.showArrow === undefined ? 'selected' : ''}>Shop default (${this.shopStyle.showArrow ? 'shown' : 'hidden'})</option>
                        <option value="1" ${ann.showArrow === true ? 'selected' : ''}>Show</option>
                        <option value="0" ${ann.showArrow === false ? 'selected' : ''}>Hide</option>
                    </select>
                </div>

                ${/* Identity and placement: set once, rarely touched again, so
                      they fold away instead of taking room from the three
                      fields above. */ ''}
                <details class="ab-props-more" ${this.propsMoreOpen ? 'open' : ''}>
                    <summary>Numbering &amp; region</summary>
                    <div class="ab-form-row">
                        <div class="ab-form-group">
                            <label class="ab-label" for="ab-num"
                                   title="${ann.subNumber
                                       ? 'A sub-number follows its parent. Change the parent&#39;s number, or clear Sub-number first.'
                                       : 'Type a new number and the balloon moves to that place in the sequence; the balloons in between move along one. You can also click the selected balloon&#39;s number in the list.'}">Number</label>
                            <input id="ab-num" class="ab-input" type="number" step="1" min="1"
                                   value="${esc(ann.balloonNumber)}" ${ann.subNumber ? 'disabled' : ''} />
                        </div>
                        ${/* The separator itself is NOT here. It applies to
                              every drawing, so it belongs with the other
                              shop-wide settings under Settings in the toolbar.
                              A control you reach by first selecting one
                              balloon reads as a property of that balloon. */ ''}
                        <div class="ab-form-group">
                            <label class="ab-label" for="ab-sub"
                                   title="Makes this a child of the number on the left, printed as ${esc(`5${this.subSeparator}1`)}. A child does not take a number of its own, so adding one never renumbers the balloons after it. Leave blank for a normal balloon.">Sub-number</label>
                            <input id="ab-sub" class="ab-input" type="number" step="1" min="1"
                                   placeholder="none" value="${esc(ann.subNumber ?? '')}" />
                        </div>
                    </div>
                    <div class="ab-form-group">
                        <label class="ab-label" for="ab-section"
                               title="This balloon's cell in the drawing's grid, e.g. D8 - what the recognition model calls 'belong'. Blank or UNMATCHED means it could not be placed, and it will sort after every placed balloon.">Region</label>
                        <input id="ab-section" class="ab-input"
                               placeholder="${REGION_UNMATCHED}" value="${esc(ann.section)}" />
                    </div>
                    <div class="ab-form-group">
                        <label class="ab-label ab-check"><input id="ab-isnote" type="checkbox" ${ann.isNote ? 'checked' : ''} /> Treat as a note</label>
                    </div>
                    <div class="ab-form-group">
                        <label class="ab-label ab-check"
                               title="The ▲ marking this surface AS a datum. It is the reference other characteristics are measured from, and is not itself measured. Not the same as a control frame that cites datums A B C.">
                            <input id="ab-isdatum" type="checkbox" ${ann.isDatum ? 'checked' : ''} /> Datum feature</label>
                    </div>
                </details>
            </div>`;

        const bind = (sel: string, ev: string, fn: (el: any) => void) => {
            const el = this.propertyEditorEl.querySelector(sel) as HTMLElement;
            el?.addEventListener(ev, () => fn(el));
        };
        // Moves the balloon to that place in the sequence rather than just
        // stamping the number on it, which used to leave two balloons sharing
        // a number and a gap where this one had been.
        bind('#ab-num', 'change', el => {
            const n = parseInt(el.value, 10);
            this.moveNumber(ann.id, n);
        });
        bind('#ab-sub', 'change', el => {
            const n = parseInt(el.value, 10);
            // Blank, 0 or nonsense all mean "not a child"; storing undefined
            // rather than 0 keeps formatBalloonNumber's falsy test honest.
            this.updateAnnotation(ann.id, {
                subNumber: Number.isFinite(n) && n > 0 ? n : undefined
            });
        });
        this.mountFeatureEditor(ann);
        this.mountInspectionToolEditor(ann);

        bind('#ab-content', 'change', el => {
            // One Supply strips a tolerance written into the dimension -
            // "Ø.380 ±.005" - into the tolerance fields, if they are empty.
            const split = splitTolerance(el.value);
            if (split && !String(ann.upperTol ?? '').trim() && !String(ann.lowerTol ?? '').trim()) {
                this.updateAnnotation(ann.id, {
                    content: split.content, upperTol: split.upper, lowerTol: split.lower, toleranceStandard: undefined,
                });
                notifyInfo(`Tolerance ${split.upper} / ${split.lower} moved into the tolerance fields.`);
                this.renderProperties();
                return;
            }
            this.updateAnnotation(ann.id, {content: el.value});
        });
        bind('#ab-insert', 'change', el => {
            const sym = el.value;
            el.value = '';
            if (!sym) return;
            const ta = this.propertyEditorEl.querySelector('#ab-content') as HTMLTextAreaElement;
            const at = ta.selectionStart ?? ta.value.length, to = ta.selectionEnd ?? at;
            const text = ta.value.slice(0, at) + sym + ta.value.slice(to);
            this.updateAnnotation(ann.id, {content: text});
            ta.value = text;
            ta.focus();
            ta.setSelectionRange(at + sym.length, at + sym.length);
            // A GD&T glyph names the characteristic; set it where the catalogue knows it.
            getLookupAsync(FeatureSymbolsRow.lookupKey).then((lookup: any) => {
                const hit = (lookup?.items ?? []).find((f: any) => f.Symbol === sym && f.IsActive !== 0);
                if (hit && hit.Id !== ann.typeId) {
                    this.updateAnnotation(ann.id, {typeId: hit.Id, typeName: hit.Name});
                    this.renderProperties();
                }
            }, () => { /* no catalogue: the text is still inserted */ });
        });
        bind('#ab-audit', 'click', () => {
            if (ann.audited) this.setAudited([ann.id], false);
            else this.auditAndNext();
        });
        bind('#ab-feature', 'change', el => {
            const feature = el.value as BalloonAnnotation['dimensionFeature'];
            if (feature === 'theoretical' || feature === 'reference') {
                this.updateAnnotation(ann.id, {dimensionFeature: feature, upperTol: '', lowerTol: '', toleranceStandard: undefined});
            } else {
                this.updateAnnotation(ann.id, {dimensionFeature: undefined});
                if (ann.toleranceStandard) this.applyToleranceStandard(ann.id, ann.toleranceStandard);
            }
            this.renderProperties();
        });
        bind('#ab-category', 'change', el =>
            this.updateAnnotation(ann.id, {numberCategory: el.value === (ann.isNote ? 'notes' : 'normal') ? undefined : el.value}));
        bind('#ab-export', 'change', el =>
            this.updateAnnotation(ann.id, {exportMode: el.value === 'text' ? undefined : el.value}));
        bind('#ab-arrow', 'change', el =>
            this.updateAnnotation(ann.id, {showArrow: el.value === '' ? undefined : el.value === '1'}));
        this.propertyEditorEl.querySelector('#ab-category-order')?.addEventListener('click', e => {
            e.preventDefault();
            this.openCategoryOrder();
        });
        this.propertyEditorEl.querySelector('#ab-tool-default')?.addEventListener('click', e => {
            e.preventDefault();
            this.openDefaultTool();
        });
        this.propertyEditorEl.querySelectorAll('[data-rot]').forEach(btn => btn.addEventListener('click', () => {
            const d = Number((btn as HTMLElement).dataset.rot);
            const next = d === 0 ? 0 : ((((ann.cropRotation ?? 0) + d) % 360) + 360) % 360;
            this.updateAnnotation(ann.id, {cropRotation: next || undefined});
            this.renderProperties();
        }));
        this.propertyEditorEl.querySelector('#ab-crop-stage')?.addEventListener('wheel', (e: any) => {
            e.preventDefault();
            this.cropZoom = Math.max(0.2, Math.min(10, this.cropZoom * (e.deltaY > 0 ? 1 / 1.2 : 1.2)));
            const inner = this.propertyEditorEl.querySelector('.ab-crop-inner') as HTMLElement | null;
            if (inner) inner.style.transform = `scale(${this.cropZoom}) rotate(${ann.cropRotation ?? 0}deg)`;
        }, {passive: false} as any);
        // Focusing the symbol field opens the GD&T palette, as in DS_ERP.
        // Not on blur-close: clicking a symbol blurs the field on some
        // browsers even with mousedown prevented, and a palette that shuts as
        // you reach for it is worse than one you close yourself.
        bind('#ab-content', 'focus', el => this.openGdtPalette(el, ann.id));
        // A tolerance typed by hand is no longer a general tolerance and loses
        // its label - otherwise a later "Update applied" would overwrite it.
        // The same rule applyBatch follows for a multi-selection.
        const handTyped = (patch: Partial<BalloonAnnotation>) => {
            this.updateAnnotation(ann.id, {...patch, toleranceStandard: undefined});
            const std = this.propertyEditorEl.querySelector('#ab-tolstd') as HTMLSelectElement | null;
            if (std) std.value = '';
        };
        bind('#ab-upper', 'change', el => handTyped({upperTol: el.value}));
        bind('#ab-lower', 'change', el => handTyped({lowerTol: el.value}));
        // One Supply's status marker: said while typing, not corrected behind
        // the operator's back - they may be halfway through changing both.
        const tolStatus = () => {
            const u = (this.propertyEditorEl.querySelector('#ab-upper') as HTMLInputElement | null)?.value;
            const l = (this.propertyEditorEl.querySelector('#ab-lower') as HTMLInputElement | null)?.value;
            const el = this.propertyEditorEl.querySelector('#ab-tol-status');
            if (el) el.textContent = isToleranceLogicValid(u, l) ? '' : '⚠ Upper is below lower - check the signs.';
        };
        bind('#ab-upper', 'input', tolStatus);
        bind('#ab-lower', 'input', tolStatus);
        tolStatus();
        bind('#ab-tolstd', 'change', el => this.applyToleranceStandard(ann.id, el.value));
        bind('#ab-section', 'change', el => this.updateAnnotation(ann.id, {section: el.value}));
        bind('#ab-qty', 'change', el => {
            const parsed = parseQuantityInput(el.value);
            if (!parsed.ok) {
                notifyWarning('Quantity is a number of features: 4, 4x or (1-4).');
                el.value = formatQuantityRange(ann.quantity);
                return;
            }
            this.updateAnnotation(ann.id, {quantity: parsed.quantity});
            el.value = formatQuantityRange(parsed.quantity);
        });
        bind('#ab-isnote', 'change', el => this.updateAnnotation(ann.id, {isNote: el.checked}));
        bind('#ab-isdatum', 'change', el => this.updateAnnotation(ann.id, {isDatum: el.checked}));
        // Remembered across selections: re-render happens on every click, and
        // a fold that sprang shut each time would be worse than no fold.
        this.propertyEditorEl.querySelector('.ab-props-more')
            ?.addEventListener('toggle', e =>
                this.propsMoreOpen = (e.target as HTMLDetailsElement).open);
        this.propertyEditorEl.querySelector('#ab-del')?.addEventListener('click', () => this.deleteSelected());
    }

    /**
     * The property panel for a multi-balloon selection.
     *
     * Ported from One Supply's batch mode. Every field starts EMPTY rather than
     * pre-filled from the primary, and only fields the operator types into are
     * written. That is the whole safety property: a panel that pre-fills would
     * make "correct one tolerance" and "stamp the primary's symbol over forty
     * balloons" the same gesture.
     *
     * Number and sub-number are absent, not disabled - they are per-balloon by
     * definition, and offering them greyed out only invites the question.
     */
    private renderBatchProperties() {
        const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g,
            c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]!));

        const selected = this.annotations.filter(a => this.selectedIds.has(a.id));
        const n = selected.length;

        // What they already agree on, shown as the placeholder. "(varies)" is
        // the honest answer where they differ, and it is never written.
        const shared = (f: BatchField) => {
            const v = commonValue(selected, f);
            return v === undefined ? '(varies)' : (String(v ?? '') || '(empty)');
        };

        const numbers = selected
            .slice()
            .sort(compareBalloonNumber)
            .map(a => formatBalloonNumber(a, this.subSeparator));
        const preview = numbers.slice(0, 12).join(', ')
            + (numbers.length > 12 ? `, +${numbers.length - 12} more` : '');

        this.propertyEditorEl.innerHTML = `
            <div class="ab-panel-header">
                <div class="ab-panel-title">${n} balloons selected</div>
                <button id="ab-batch-clear" class="ab-btn ab-btn-icon" title="Clear the selection">&times;</button>
            </div>
            <div class="ab-panel-content ab-props">
                <p class="ab-batch-list" title="${esc(numbers.join(', '))}">${esc(preview)}</p>
                <p class="ab-modal-note">Only fields you change are applied. Anything left blank
                   keeps each balloon's own value.</p>

                <div class="ab-form-group">
                    <label class="ab-label" for="ab-b-content">Symbol / text</label>
                    <textarea id="ab-b-content" class="ab-textarea ab-symbol" rows="2"
                              data-bf="content" placeholder="${esc(shared('content'))}"></textarea>
                </div>
                <div class="ab-form-row">
                    <div class="ab-form-group">
                        <label class="ab-label" for="ab-b-lower">Lower tol</label>
                        <input id="ab-b-lower" class="ab-input" data-bf="lowerTol"
                               placeholder="${esc(shared('lowerTol'))}" />
                    </div>
                    <div class="ab-form-group">
                        <label class="ab-label" for="ab-b-upper">Upper tol</label>
                        <input id="ab-b-upper" class="ab-input" data-bf="upperTol"
                               placeholder="${esc(shared('upperTol'))}" />
                    </div>
                </div>
                <div class="ab-form-group">
                    <label class="ab-label" for="ab-b-qty">Quantity</label>
                    <input id="ab-b-qty" class="ab-input" type="number" step="1" min="1"
                           data-bf="quantity" placeholder="${esc(shared('quantity'))}" />
                </div>
                <div class="ab-form-group">
                    <label class="ab-label" for="ab-b-section">Region</label>
                    <input id="ab-b-section" class="ab-input" data-bf="section"
                           placeholder="${esc(shared('section'))}" />
                </div>
                ${/* The one lookup worth batching: "these forty go on the CMM"
                      is a normal thing to say, where "these forty are all
                      position tolerances" is not. */ ''}
                <div class="ab-form-group">
                    <label class="ab-label">Inspection tool</label>
                    <div class="ab-batch-tool-editor"></div>
                </div>
                <div class="ab-form-group">
                    <label class="ab-label" for="ab-b-note">Treat as a note</label>
                    <select id="ab-b-note" class="ab-select" data-bf="isNote">
                        <option value="">Leave unchanged</option>
                        <option value="1">Yes &mdash; all selected</option>
                        <option value="0">No &mdash; all selected</option>
                    </select>
                </div>
                ${/* One Supply's batch fields beyond DSRFQ's original seven. A
                      select's "Leave unchanged" is the absence of an edit. */ ''}
                <div class="ab-form-group">
                    <label class="ab-label">Characteristic</label>
                    <div class="ab-batch-feature-editor"></div>
                </div>
                <div class="ab-form-row">
                    <div class="ab-form-group">
                        <label class="ab-label" for="ab-b-feature">Dimension feature</label>
                        <select id="ab-b-feature" class="ab-select" data-bsel="dimensionFeature">
                            <option value="__keep">Leave unchanged</option>
                            ${DIMENSION_FEATURES.map(f => `<option value="${f.key}">${f.label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="ab-form-group">
                        <label class="ab-label" for="ab-b-category">Number category</label>
                        <select id="ab-b-category" class="ab-select" data-bsel="numberCategory">
                            <option value="__keep">Leave unchanged</option>
                            ${NUMBER_CATEGORIES.map(c => `<option value="${c.key}">${c.label}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="ab-form-group">
                    <label class="ab-label" for="ab-b-tolstd">Tolerance from</label>
                    <select id="ab-b-tolstd" class="ab-select" data-bsel="toleranceStandard">
                        <option value="__keep">Leave unchanged</option>
                        ${standardOptions(loadToleranceSettings()).map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}
                    </select>
                </div>
                <div class="ab-form-row">
                    <div class="ab-form-group">
                        <label class="ab-label" for="ab-b-export">Export as</label>
                        <select id="ab-b-export" class="ab-select" data-bsel="exportMode">
                            <option value="__keep">Leave unchanged</option>
                            ${EXPORT_MODES.map(m => `<option value="${m.key}">${m.label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="ab-form-group">
                        <label class="ab-label" for="ab-b-arrow">Arrow</label>
                        <select id="ab-b-arrow" class="ab-select" data-bsel="showArrow">
                            <option value="__keep">Leave unchanged</option>
                            <option value="1">Show</option>
                            <option value="0">Hide</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="ab-panel-footer">
                <button id="ab-batch-audit" class="ab-btn" title="Mark every selected balloon reviewed">
                    Audit ${n}
                </button>
                <button id="ab-batch-apply" class="ab-btn ab-btn-primary" style="flex:1; justify-content:center;">
                    Apply to ${n}
                </button>
                <button id="ab-batch-delete" class="ab-btn ab-btn-danger" title="Delete all selected balloons">
                    ${getIcon('trash')}
                </button>
            </div>`;

        const applyBtn = this.propertyEditorEl.querySelector('#ab-batch-apply') as HTMLButtonElement;
        const refreshApply = () => {
            const k = this.batchEdit.dirty.size;
            applyBtn.disabled = k === 0;
            applyBtn.textContent = k ? `Apply ${k} field${k === 1 ? '' : 's'} to ${n}` : `Apply to ${n}`;
        };

        // Typing marks the field dirty. An emptied field STAYS dirty and writes
        // a blank - that is how you clear a tolerance across a selection, and
        // it is why the guards in validateBatch exist for the fields where
        // blanking would be destructive.
        this.propertyEditorEl.querySelectorAll('[data-bf]').forEach(el => {
            el.addEventListener('input', () => {
                const f = (el as HTMLElement).getAttribute('data-bf') as BatchField;
                this.batchEdit.dirty.add(f);
                this.batchEdit.values[f] = (el as HTMLInputElement).value;
                refreshApply();
            });
            el.addEventListener('change', () => {
                const f = (el as HTMLElement).getAttribute('data-bf') as BatchField;
                const raw = (el as HTMLInputElement).value;
                if (f === 'isNote') {
                    // The select's own "leave unchanged" is the absence of an
                    // edit, so it removes the field rather than writing false.
                    if (raw === '') { this.batchEdit.dirty.delete(f); delete this.batchEdit.values[f]; }
                    else { this.batchEdit.dirty.add(f); this.batchEdit.values[f] = raw === '1'; }
                    refreshApply();
                }
            });
        });
        // The lookup cannot be a data-bf input, so it marks itself dirty. Empty
        // stays "leave unchanged" rather than "clear it" - clearing forty tool
        // assignments should take more than tabbing past a dropdown.
        const toolHost = this.propertyEditorEl
            .querySelector('.ab-batch-tool-editor') as HTMLElement;
        if (toolHost) {
            const toolEditor = new LookupEditor({
                element: el => toolHost.appendChild(el),
                lookupKey: InspectionToolsRow.lookupKey,
                filterField: 'IsActive',
                filterValue: '1',
                allowClear: true,
            });
            toolEditor.domNode.addEventListener('change', () => {
                const raw = toolEditor.value;
                if (!raw) {
                    this.batchEdit.dirty.delete('inspectionToolId');
                    delete this.batchEdit.values.inspectionToolId;
                } else {
                    this.batchEdit.dirty.add('inspectionToolId');
                    this.batchEdit.values.inspectionToolId = Number(raw);
                }
                refreshApply();
            });
        }

        this.propertyEditorEl.querySelectorAll('[data-bsel]').forEach(el => {
            el.addEventListener('change', () => {
                const f = (el as HTMLElement).getAttribute('data-bsel') as BatchField;
                const raw = (el as HTMLSelectElement).value;
                if (raw === '__keep') {
                    this.batchEdit.dirty.delete(f);
                    delete this.batchEdit.values[f];
                } else {
                    this.batchEdit.dirty.add(f);
                    this.batchEdit.values[f] = f === 'showArrow' ? raw === '1' : raw;
                }
                refreshApply();
            });
        });
        const featureHost = this.propertyEditorEl.querySelector('.ab-batch-feature-editor') as HTMLElement;
        if (featureHost) {
            const featureEditor = new LookupEditor({
                element: el => featureHost.appendChild(el),
                lookupKey: FeatureSymbolsRow.lookupKey,
                filterField: 'IsActive',
                filterValue: '1',
                allowClear: true,
            });
            featureEditor.domNode.addEventListener('change', () => {
                const raw = featureEditor.value;
                if (!raw) {
                    this.batchEdit.dirty.delete('typeId');
                    delete this.batchEdit.values.typeId;
                } else {
                    this.batchEdit.dirty.add('typeId');
                    this.batchEdit.values.typeId = Number(raw);
                }
                refreshApply();
            });
        }
        this.propertyEditorEl.querySelector('#ab-batch-audit')?.addEventListener('click', () =>
            this.setAudited([...this.selectedIds].filter(id => this.annotations.some(a => a.id === id)), true));

        refreshApply();

        this.propertyEditorEl.querySelector('#ab-batch-clear')
            ?.addEventListener('click', () => this.selectAnnotation(null));

        this.propertyEditorEl.querySelector('#ab-batch-delete')?.addEventListener('click', () => {
            if (!confirm(`Delete ${n} selected balloon${n === 1 ? '' : 's'}? The numbers after them close up. Ctrl+Z undoes it.`)) return;
            this.deleteSelected();
        });

        applyBtn.addEventListener('click', () => {
            const check = validateBatch(this.batchEdit);
            if (!check.ok) { notifyWarning(check.message ?? 'Nothing to apply.'); return; }

            const standard = this.batchEdit.dirty.has('toleranceStandard')
                ? String(this.batchEdit.values.toleranceStandard ?? '') : null;
            const outcome = applyBatch(this.annotations, this.selectedIds, this.batchEdit);
            this.annotations = outcome.annotations;
            // A tolerance standard is only a label until each balloon is
            // recalculated from it - the batch form of "Tolerance from".
            if (standard) {
                const settings = loadToleranceSettings();
                const src = sourceFromStandard(standard, settings);
                let missed = 0;
                for (const a of this.annotations) {
                    if (!this.selectedIds.has(a.id) || !src) continue;
                    const rule = calcForSource(src, a.content, !!a.isDatum);
                    if (!rule || rule === 'not-covered'
                        || (settings.exclude.reference && isReferenceBalloon(a))
                        || (settings.exclude.theoretical && isTheoreticalBalloon(a))) {
                        a.toleranceStandard = undefined;
                        missed++;
                        continue;
                    }
                    a.upperTol = rule.upper;
                    a.lowerTol = rule.lower;
                    a.toleranceStandard = sourceStandard(src);
                }
                if (missed) notifyWarning(`${missed} of the selected balloons have no rule in ${standard} and kept their tolerance.`);
            }
            this.batchEdit = emptyBatchEdit();
            this.dirty = true;
            this.renderAll();

            const names = outcome.fields.map(f => BATCH_FIELD_LABELS[f]).join(', ');
            notifySuccess(`Set ${names} on ${outcome.changed} balloon`
                + `${outcome.changed === 1 ? '' : 's'}. Save to keep it.`);
        });
    }

    /**
     * The characteristic picker, over MasterFeatureSymbols.
     *
     * A Serenity widget rather than a `<select>` so the vocabulary comes from
     * the lookup script and stays in step with the table - the whole point of
     * having a shared catalogue is that adding a symbol to it does not mean
     * editing this file.
     *
     * Mounted separately from the panel's innerHTML because the panel is
     * rebuilt on every selection change: constructing into a detached host and
     * appending is the pattern CostingWorkspace uses for its material picker.
     */
    private mountFeatureEditor(ann: BalloonAnnotation) {
        const host = this.propertyEditorEl.querySelector('.ab-feature-editor') as HTMLElement;
        if (!host) return;

        const editor = new LookupEditor({
            element: el => host.appendChild(el),
            lookupKey: FeatureSymbolsRow.lookupKey,
            // A retired symbol stops being offered without breaking balloons
            // that already reference it. Matches DS_ERP.
            filterField: 'IsActive',
            filterValue: '1',
            // "Controls nothing catalogued" is a real answer for a plain
            // dimension, so it has to stay reachable once something is picked.
            allowClear: true
        });
        editor.value = ann.typeId == null ? '' : String(ann.typeId);

        editor.domNode.addEventListener('change', () => {
            const raw = editor.value;
            this.updateAnnotation(ann.id, {
                // Cleared is undefined, not 0: FeatureSymbolID is a foreign key
                // and 0 is not a symbol.
                typeId: raw ? Number(raw) : undefined,
                typeName: raw ? editor.text : ''
            });
        });
    }

    /**
     * The instrument picker, over MasterInspectionTools.
     *
     * Same shape as the characteristic picker above, and mounted the same way -
     * the panel is rebuilt on every selection change, so a Serenity widget has
     * to be constructed into a fresh host rather than declared once.
     */
    private mountInspectionToolEditor(ann: BalloonAnnotation) {
        const host = this.propertyEditorEl.querySelector('.ab-tool-editor') as HTMLElement;
        if (!host) return;

        const editor = new LookupEditor({
            element: el => host.appendChild(el),
            lookupKey: InspectionToolsRow.lookupKey,
            filterField: 'IsActive',
            filterValue: '1',
            // "Not stated" is the common case, so it has to stay reachable.
            allowClear: true
        });
        editor.value = ann.inspectionToolId == null ? '' : String(ann.inspectionToolId);

        editor.domNode.addEventListener('change', () => {
            const raw = editor.value;
            this.updateAnnotation(ann.id, {
                inspectionToolId: raw ? Number(raw) : undefined,
                inspectionToolName: raw ? editor.text : ''
            });
        });
    }

    // ─── One Supply: tools, menu, sub-numbers, audit ─────────────────────

    private setTool(m: ToolMode) {
        this.toolMode = m;
        if (m !== 'frame_select') this.pendingFrameApply = null;
        this.renderToolbar();
        this.renderCanvas();
    }

    /** The property panel's picture of the balloon, turned and zoomed. */
    private cropPreviewHtml(ann: BalloonAnnotation): string {
        const src = this.pages[ann.pageIndex];
        if (!src || !ann.rect) return '<em>No picture</em>';
        this.ensurePageSize(ann.pageIndex);
        const size = this.pageSizes.get(ann.pageIndex);
        const g = cropGeometry(ann.rect, size ? size.w / size.h : null, 240, 90);
        const style = `width:${g.width}px;height:${g.height}px;background-image:url('${src.replace(/['\\]/g, '\\$&')}');`
            + `background-size:${g.size};background-position:${g.position}`;
        const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
        return `<div class="ab-crop-inner" style="transform:scale(${this.cropZoom}) rotate(${ann.cropRotation ?? 0}deg)">
                  <div class="ab-crop" style="${attr(style)}"></div></div>`;
    }

    /** One Supply's bubble right-click menu, for the balloon or the whole selection. */
    private openBalloonContextMenu(id: string, clientX: number, clientY: number) {
        if (!this.selectedIds.has(id)) this.selectAnnotation(id);
        const targets = this.annotations.filter(a => this.selectedIds.has(a.id));
        const first = targets[0];
        if (!first) return;
        const style = resolveBalloonStyle(first, this.shopStyle);
        this.closeBalloonMenuFn?.();
        this.closeBalloonMenuFn = openBalloonMenu(this.container, clientX, clientY, {
            count: targets.length,
            color: style.stroke,
            shape: style.shape,
            lineWidth: first.balloonLineWidth ?? this.shopStyle.lineWidth,
            arrow: style.arrow,
            boxShown: !first.boxHidden,
            isChild: !!first.subNumber,
            audited: !!first.audited,
        }, action => this.applyMenuAction(action, targets.map(t => t.id)));
    }

    private applyMenuAction(action: BalloonMenuAction, ids: string[]) {
        const set = new Set(ids);
        const patch = (p: Partial<BalloonAnnotation>) => {
            for (const a of this.annotations) if (set.has(a.id)) Object.assign(a, p);
            this.dirty = true;
            this.renderAll();
        };
        switch (action.kind) {
            case 'color': return patch({balloonColor: action.value, balloonStyle: undefined});
            case 'shape': return patch({balloonShape: action.value});
            case 'size': return patch({balloonScale: action.value ?? undefined});
            case 'width': return patch({balloonLineWidth: action.value});
            case 'style': return patch({
                balloonStyle: action.value === 'default' ? undefined : action.value,
                balloonColor: undefined, textColor: undefined,
            });
            case 'arrow': return patch({showArrow: action.value});
            case 'box': return patch({boxHidden: !action.value});
            case 'audit': return this.setAudited(ids, action.value);
            case 'subNumber': return this.startPickParent(ids[0]);
            case 'restoreNumber': return this.restoreNormalNumber(ids[0]);
            case 'delete': return this.deleteSelected();
        }
    }

    private startPickParent(id: string) {
        this.pickParentFor = id;
        this.renderCanvas();
        notifyInfo('Now click the balloon this one belongs under. Esc cancels.');
    }

    private cancelPickParent() {
        this.pickParentFor = null;
        this.renderCanvas();
    }

    /**
     * Make the picked balloon a child of `parentId` - One Supply's 设为间隔序号.
     * Its old number closes up, and any children of its own come along.
     */
    private completeSubNumber(parentId: string) {
        const child = this.annotations.find(a => a.id === this.pickParentFor);
        const parent = this.annotations.find(a => a.id === parentId);
        this.pickParentFor = null;
        if (!child || !parent) { this.renderCanvas(); return; }
        if (parent.pageIndex !== child.pageIndex) {
            notifyWarning('Pick a parent on the same page.');
            this.renderCanvas();
            return;
        }
        if (isReferenceBalloon(parent)) {
            notifyWarning('A reference dimension cannot be a parent.');
            this.renderCanvas();
            return;
        }
        const page = child.pageIndex;
        const continuous = isContinuousNumbering(this.annotations);
        const oldNumber = child.balloonNumber;
        const wasTop = !child.subNumber;
        const target = parent.balloonNumber;
        if (wasTop && target === oldNumber) { this.renderCanvas(); return; }

        const ownKids = wasTop
            ? this.annotations.filter(k => k.subNumber && k.pageIndex === page && k.balloonNumber === oldNumber)
                .sort((a, b) => a.subNumber! - b.subNumber!)
            : [];
        const siblings = this.annotations.filter(s => s !== child && s.subNumber
            && s.pageIndex === page && s.balloonNumber === target);
        let sub = siblings.length ? Math.max(...siblings.map(s => s.subNumber!)) + 1 : 1;
        child.balloonNumber = target;
        child.subNumber = sub++;
        for (const k of ownKids) { k.balloonNumber = target; k.subNumber = sub++; }

        if (wasTop) {
            closeNumberGap(this.annotations, oldNumber, page, continuous);
        } else {
            this.annotations
                .filter(s => s.subNumber && s.pageIndex === page && s.balloonNumber === oldNumber)
                .sort((a, b) => a.subNumber! - b.subNumber!)
                .forEach((s, i) => s.subNumber = i + 1);
        }
        this.dirty = true;
        this.renderAll();
        notifySuccess(`Now balloon ${formatBalloonNumber(child, this.subSeparator)}. Ctrl+Z to undo.`);
    }

    /** A child back to a number of its own, at the end of the sequence. */
    private restoreNormalNumber(id: string) {
        const a = this.annotations.find(x => x.id === id);
        if (!a?.subNumber) return;
        const parentNumber = a.balloonNumber, page = a.pageIndex;
        a.subNumber = undefined;
        a.balloonNumber = this.nextBalloonNumber();
        this.annotations
            .filter(s => s.subNumber && s.pageIndex === page && s.balloonNumber === parentNumber)
            .sort((x, y) => x.subNumber! - y.subNumber!)
            .forEach((s, i) => s.subNumber = i + 1);
        this.dirty = true;
        this.renderAll();
        notifySuccess(`Now balloon ${a.balloonNumber}. Renumber to put it in order.`);
    }

    private setAudited(ids: string[], value: boolean) {
        if (!ids.length) return;
        const who = (Authorization.userDefinition as any)?.Username ?? '';
        const now = new Date().toISOString();
        const set = new Set(ids);
        for (const a of this.annotations) {
            if (!set.has(a.id)) continue;
            a.audited = value;
            a.auditedOn = value ? now : undefined;
            a.auditedBy = value ? who : undefined;
        }
        this.dirty = true;
        this.renderAll();
    }

    /** F2: mark the selection audited and move to the next balloon not yet reviewed. */
    private auditAndNext() {
        const ordered = listOrder(this.annotations, true, this.currentPage);
        const ids = [...this.selectedIds].filter(id => this.annotations.some(a => a.id === id));
        if (ids.length) this.setAudited(ids, true);
        const next = nextUnaudited(ordered.map(a => ({id: a.id, audited: a.audited})), this.selectedId);
        if (!next) {
            notifySuccess('Every balloon on this drawing is audited.');
            return;
        }
        const ann = this.annotations.find(a => a.id === next)!;
        if (ann.pageIndex !== this.currentPage) this.setPage(ann.pageIndex);
        this.selectAnnotation(next);
    }

    // ─── One Supply: grid edit and frame ─────────────────────────────────

    /** Re-file every balloon on these pages into the cell it falls in. */
    private refile(pages: number[]): number {
        let moved = 0;
        for (const page of pages) {
            for (const a of this.annotations) {
                if (a.pageIndex !== page) continue;
                const cell = this.cellFor(a.rect, page);
                if (cell.section && cell.section !== a.section) { a.section = cell.section; moved++; }
            }
        }
        return moved;
    }

    private async saveFrame(pages: number[], frame: Rect | null) {
        for (const page of pages) {
            const on = this.annotations.find(a => a.pageIndex === page && a.gridStart && a.gridEnd);
            const extent = on ? parseGridExtent(on.gridStart, on.gridEnd) : null;
            // A new frame replaces any hand-adjusted lines with equal spacing inside it.
            const profile = extent ? buildEqualProfile(extent, frame ?? {x: 0, y: 0, width: 100, height: 100}) : null;
            try {
                const id = await saveGridProfile(this.costingPartId, page + 1, profile,
                    this.gridRowIds.get(page + 1) ?? null, {frame});
                if (id) this.gridRowIds.set(page + 1, id);
                if (profile && id) this.gridByPage.set(page + 1, {id, profile});
            } catch (e: any) {
                notifyError(`Could not save the grid frame for page ${page + 1}: ${e?.message ?? e}`);
            }
        }
    }

    /** One Supply's 编辑网格分区. */
    private async openGridEdit() {
        const on = this.annotations.find(a => a.pageIndex === this.currentPage && a.gridStart && a.gridEnd);
        const r = await gridEditDialog(this.container, on?.gridStart ?? '', on?.gridEnd ?? '',
            this.pageFrame.has(this.currentPage), (s, e) => {
                const ext = parseGridExtent(s, e);
                if (!ext) return null;
                const [x, y] = expectedLineCounts(ext);
                return `${x - 1} columns × ${y - 1} rows`;
            });
        if (!r) return;

        const pages = r.allPages
            ? [...new Set([this.currentPage, ...this.annotations.map(a => a.pageIndex)])]
            : [this.currentPage];
        for (const a of this.annotations)
            if (pages.includes(a.pageIndex)) { a.gridStart = r.start; a.gridEnd = r.end; }
        this.gridProfile = null;
        for (const p of pages) this.gridByPage.delete(p + 1);

        if (r.frame === 'select') {
            this.pendingFrameApply = {recalc: r.recalc, allPages: r.allPages};
            this.dirty = true;
            this.setTool('frame_select');
            notifyInfo('Drag a box round the printed drawing border.');
            return;
        }
        if (r.frame === 'reset') {
            for (const p of pages) this.pageFrame.delete(p);
            await this.saveFrame(pages, null);
        }
        const moved = r.recalc ? this.refile(pages) : 0;
        this.dirty = true;
        this.showGrid = true;
        this.renderAll();
        notifySuccess(`Grid set to ${r.start} – ${r.end}` + (r.recalc ? `; ${moved} balloon${moved === 1 ? '' : 's'} re-filed.` : '.'));
    }

    /** The drawing border was dragged: divide the grid inside it. */
    private async setGridFrame(rect: Rect) {
        const pending = this.pendingFrameApply ?? {recalc: true, allPages: false};
        this.pendingFrameApply = null;
        const pages = pending.allPages
            ? [...new Set([this.currentPage, ...this.annotations.map(a => a.pageIndex)])]
            : [this.currentPage];
        for (const p of pages) this.pageFrame.set(p, {...rect});
        this.gridProfile = null;
        this.toolMode = 'select';
        await this.saveFrame(pages, rect);
        const moved = pending.recalc ? this.refile(pages) : 0;
        if (moved) this.dirty = true;
        this.showGrid = true;
        this.renderAll();
        notifySuccess('Grid frame set' + (pending.recalc ? `; ${moved} balloon${moved === 1 ? '' : 's'} re-filed.` : '.'));
    }

    // ─── One Supply: settings dialogs ────────────────────────────────────

    private async openBubbleSettings() {
        const selected = this.annotations.filter(a => this.selectedIds.has(a.id));
        const r = await bubbleSettingsDialog(this.container, this.shopStyle, selected.length, canEditShopSettings());
        if (!r) return;
        if (r.scope === 'shop') {
            this.shopStyle = r.style;
            saveBubbleStyle(r.style);
            this.renderAll();
            notifySuccess('Saved as the shop default. Balloons styled on their own keep their style.');
            return;
        }
        for (const a of selected)
            Object.assign(a, {
                balloonColor: r.style.borderColor, textColor: r.style.textColor, balloonShape: r.style.shape,
                balloonLineWidth: r.style.lineWidth, showArrow: r.style.showArrow, balloonStyle: undefined,
            });
        this.dirty = true;
        this.renderAll();
    }

    private async openSizeScope() {
        const r = await sizeScopeDialog(this.container, this.balloonSizeMultiplier);
        if (!r) return;
        const old = this.balloonSizeMultiplier;
        if (r.scope === 'all') {
            this.balloonSizeMultiplier = r.size;
            for (const a of this.annotations) a.balloonScale = undefined;
        } else if (r.scope === 'page') {
            for (const a of this.annotations)
                if (a.pageIndex === this.currentPage) a.balloonScale = +(r.size / old).toFixed(3);
        } else {
            // New balloons only: existing ones keep the size they show now.
            for (const a of this.annotations) a.balloonScale = +(((a.balloonScale ?? 1) * old) / r.size).toFixed(3);
            this.balloonSizeMultiplier = r.size;
        }
        if (r.reposition !== 'none') {
            for (const a of this.annotations) {
                if (r.reposition === 'page' && a.pageIndex !== this.currentPage) continue;
                a.balloonX = Math.min(100, a.rect.x + a.rect.width + 2);
                a.balloonY = Math.max(0, a.rect.y - 2);
            }
        }
        this.dirty = true;
        this.renderAll();
    }

    private async openSymbolFilter() {
        const r = await symbolFilterDialog(this.container, loadSymbolFilter(), symbols =>
            this.annotations.filter(a => !a.isNote && symbols.length
                && applySymbolFilter(a.content, symbols) !== String(a.content ?? '').trim()).length);
        if (!r) return;
        saveSymbolFilter(r.settings);
        if (!r.cleanExisting || !r.settings.symbols.length) return;
        let changed = 0;
        for (const a of this.annotations) {
            if (a.isNote) continue;
            const next = applySymbolFilter(a.content, r.settings.symbols);
            if (next !== String(a.content ?? '').trim()) { a.content = next; changed++; }
        }
        if (changed) { this.dirty = true; this.renderAll(); }
        notifySuccess(`Cleaned ${changed} balloon${changed === 1 ? '' : 's'}.${changed ? ' Ctrl+Z to undo.' : ''}`);
    }

    private async openCategoryOrder() {
        const r = await categoryOrderDialog(this.container, this.categoryOrder);
        if (!r) return;
        this.categoryOrder = r;
        saveCategoryOrder(r);
        notifySuccess(`Saved: ${r.map(categoryLabel).join(' › ')}. Renumber uses this order.`);
    }

    private async openDefaultTool() {
        const r = await defaultToolDialog(this.container, this.editorDefaults.defaultInspectionToolId);
        if (!r) return;
        this.editorDefaults = {...this.editorDefaults, defaultInspectionToolId: r.toolId};
        saveEditorDefaults(this.editorDefaults);
        notifySuccess(r.toolId ? 'New balloons will start with this tool.' : 'New balloons start with no tool.');
    }

    // ─── Table ───────────────────────────────────────────────────────────

    private renderTable() {
        if (!this.tableEl) return;

        const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g,
            c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]!));

        // Every page by default, as in One Supply: an inspection list is the
        // whole drawing, and a balloon found on page 3 should be one click from
        // the list rather than a page-flip and a scroll away.
        const multiPage = this.pages.length > 1;
        const allPages = multiPage && this.tableAllPages;
        const rows = listOrder(this.annotations, allPages, this.currentPage);

        // One line per FEATURE, not per balloon: "4X Ø.250" is one balloon on
        // the drawing but four things to measure, and an inspection report has
        // a line for each. Listed 44_1, 44_2 - underscore, so an instance never
        // reads as a sub-number (44-1), which means something else entirely.
        const allLines = expandByQuantity(rows, this.subSeparator);
        const extra = allLines.length - rows.length;

        // Matches the number as printed, the text and either tolerance, so
        // "44", "⌖" and ".005" all find what an operator is looking for.
        const needle = this.tableFilter.trim().toLowerCase();
        const lines = needle
            ? allLines.filter(({ann: a, label}) =>
                [label, a.content, a.upperTol, a.lowerTol]
                    .some(v => String(v ?? '').toLowerCase().includes(needle)))
            : allLines;
        const hadFocus = document.activeElement?.classList?.contains('ab-table-filter');
        const caret = hadFocus ? (document.activeElement as HTMLInputElement).selectionStart : null;

        // "1_1, 1_2" reads like a separator setting gone wrong, and it is the
        // commonest thing to be asked about: the underscore is not the
        // sub-number separator and never changes with it. Say which of the two
        // this row is, and what the other would have looked like.
        const numberTitle = (a: BalloonAnnotation, instance: number, count: number) => {
            const parent = formatBalloonNumber(
                {balloonNumber: a.balloonNumber}, this.subSeparator);
            if (count > 1)
                return `Feature ${instance} of ${count} covered by balloon ${parent}. `
                    + `"${INSTANCE_SEPARATOR}" marks an instance - one balloon on the `
                    + `drawing, several identical features to measure, so the report `
                    + `gets a line for each. It is not the sub-number separator and `
                    + `does not change with it; a child balloon would read `
                    + `${formatBalloonNumber({balloonNumber: a.balloonNumber, subNumber: 1},
                                             this.subSeparator)}.`;
            if (a.subNumber)
                return `Child ${a.subNumber} of balloon ${parent} - a characteristic `
                    + `added under it, which does not renumber the balloons after it.`;
            return `Balloon ${parent}.`;
        };

        const perPage = new Map<number, number>();
        for (const a of this.annotations) perPage.set(a.pageIndex, (perPage.get(a.pageIndex) ?? 0) + 1);
        const scopeOptions = !this.pages.length
            ? '<option>No pages</option>'
            : (multiPage ? `<option value="all" ${allPages ? 'selected' : ''}>All pages (${this.annotations.length})</option>` : '')
              + this.pages.map((_, i) => `<option value="${i}" ${!allPages && i === this.currentPage ? 'selected' : ''}>`
                  + `Page ${i + 1} (${perPage.get(i) ?? 0})</option>`).join('');

        // The dimension as it sits on the drawing - One Supply's screenshot
        // column, and the fastest way to check a balloon read its text right.
        const cssUrl = (s: string) => s.replace(/['\\]/g, '\\$&');
        const crop = (a: BalloonAnnotation) => {
            const src = this.pages[a.pageIndex];
            if (!src || !a.rect) return '';
            this.ensurePageSize(a.pageIndex);
            const size = this.pageSizes.get(a.pageIndex);
            const g = cropGeometry(a.rect, size ? size.w / size.h : null);
            return `<div class="ab-crop" style="${esc(`width:${g.width}px;height:${g.height}px;`
                + `background-image:url('${cssUrl(src)}');background-size:${g.size};background-position:${g.position}`)}"></div>`;
        };
        const tolTitle = (value: string | undefined, a: BalloonAnnotation) =>
            esc((value ?? '') + (a.toleranceStandard ? ` — from ${a.toleranceStandard}` : ''));
        const columns = 6 + (this.tableImages ? 1 : 0) + (allPages ? 1 : 0);
        const audited = rows.filter(a => a.audited).length;
        // One Supply's zone colours: A green, B blue, C yellow, unplaced red.
        const zoneClass = (s?: string) => {
            const z = String(s ?? '').trim().toUpperCase();
            if (!z || z === REGION_UNMATCHED) return 'none';
            return ({A: 'a', B: 'b', C: 'c'} as Record<string, string>)[z.replace(/\d/g, '')[0]] ?? 'other';
        };

        this.tableEl.innerHTML = `
            <div class="ab-table-header">
              <div class="ab-table-head-row">
                <select class="ab-table-scope" aria-label="Which pages to list" ${this.pages.length ? '' : 'disabled'}>${scopeOptions}</select>
                <label class="ab-table-toggle" title="Show each balloon's dimension as it appears on the drawing">
                  <input type="checkbox" class="ab-table-images" ${this.tableImages ? 'checked' : ''} /> Images</label>
              </div>
              <div class="ab-table-head-row">
                <span class="ab-table-title">${rows.length} balloon${rows.length === 1 ? '' : 's'}${
                    extra > 0 ? ` &middot; ${allLines.length} characteristics` : ''}${
                    rows.length ? ` &middot; <span title="Reviewed with Audit (F2)">${audited}/${rows.length} audited</span>` : ''}${
                    needle ? ` &middot; <b>${lines.length}</b> shown` : ''}</span>
                <input class="ab-table-filter" type="search" placeholder="Filter no. / text / tol"
                       aria-label="Filter the balloon list" value="${esc(this.tableFilter)}" />
              </div>
            </div>
            <div class="ab-table-wrapper">
              <table class="ab-table ${this.tableImages ? 'has-img' : ''}">
                <thead><tr>
                  <th class="ab-c-no" title="A plain number is one balloon. &quot;1${INSTANCE_SEPARATOR}2&quot; is the second of several identical features under balloon 1. &quot;1${this.subSeparator}2&quot; would be a child balloon - a different thing, and the only one the separator setting affects.">No</th>
                  ${allPages ? '<th class="ab-c-page" title="Page">Pg</th>' : ''}
                  ${this.tableImages ? '<th class="ab-c-img">Drawing</th>' : ''}
                  <th class="ab-c-sym">Symbol</th>
                  <th class="ab-c-up">Upper</th>
                  <th class="ab-c-lo">Lower</th>
                  <th class="ab-c-qty" title="For a balloon covering several features, which one this line is.">Qty</th>
                  <th class="ab-c-audit" title="Audited - click a tick to toggle, or press F2">&#10003;</th>
                </tr></thead>
                <tbody>
                  ${lines.length ? lines.map(({ann: a, instance, count, label}) => `
                    <tr data-id="${a.id}" data-page="${a.pageIndex}" class="${this.selectedIds.has(a.id) ? 'selected' : ''} ${
                        count > 1 && instance > 1 ? 'ab-row-instance' : ''}" style="cursor:pointer;">
                      <td class="ab-c-no ${!a.subNumber && instance <= 1 ? 'ab-no-editable' : ''}"
                          ${!a.subNumber && instance <= 1 ? `data-num-edit="${a.id}"` : ''}
                          title="${esc(numberTitle(a, instance, count))}${!a.subNumber && instance <= 1
                              ? (this.selectedIds.size === 1 && this.selectedIds.has(a.id)
                                  ? ' - click to give it another number; the balloons in between move along'
                                  : ' - select it, then click its number to change it')
                              : ''}"><span class="ab-no-label">${esc(label)}</span>${
                        instance <= 1 && a.section ? `<span class="ab-zone ab-zone-${zoneClass(a.section)}" title="Grid zone">${esc(a.section)}</span>` : ''}</td>
                      ${allPages ? `<td class="ab-c-page">${a.pageIndex + 1}</td>` : ''}
                      ${this.tableImages ? `<td class="ab-c-img">${instance <= 1 ? crop(a) : ''}</td>` : ''}
                      <td class="ab-c-sym ab-symbol" title="${esc(a.content)}">${esc(a.content) || '<em>(empty)</em>'}${
                        instance <= 1 && this.viewTitleOf(a) ? `<span class="ab-vl-tag" title="In ${esc(this.viewTitleOf(a)!)}">${esc(this.viewTitleOf(a)!)}</span>` : ''}${
                        a.upperTol || a.lowerTol ? `<div class="ab-c-tolinline">${esc(a.upperTol ?? '')}${
                            a.upperTol && a.lowerTol ? ' / ' : ''}${esc(a.lowerTol ?? '')}</div>` : ''}</td>
                      <td class="ab-c-up" title="${tolTitle(a.upperTol, a)}">${esc(a.upperTol)}</td>
                      <td class="ab-c-lo" title="${tolTitle(a.lowerTol, a)}">${esc(a.lowerTol)}</td>
                      <td class="ab-c-qty">${count > 1 ? `${instance}/${count}` : esc(a.quantity ?? '')}</td>
                      <td class="ab-c-audit">${instance <= 1
                        ? `<button class="ab-audit-tick ${a.audited ? 'on' : ''}" data-audit="${a.id}"
                                   title="${a.audited ? 'Audited - click to clear' : 'Mark audited'}">&#10003;</button>` : ''}</td>
                    </tr>`).join('')
                    : needle
                    ? `<tr><td colspan="${columns}" style="text-align:center;padding:12px;">Nothing ${allPages ? '' : 'on this page '}matches "${esc(this.tableFilter)}".</td></tr>`
                    : `<tr><td colspan="${columns}" style="text-align:center;padding:12px;">No balloons ${allPages ? '' : 'on this page '}yet — pick <b>Add Balloon</b> and drag a box around a dimension.</td></tr>`}
                </tbody>
              </table>
            </div>`;

        this.tableEl.querySelectorAll('[data-audit]').forEach(btn => btn.addEventListener('click', (e: any) => {
            e.stopPropagation();
            const id = (btn as HTMLElement).dataset.audit!;
            const ann = this.annotations.find(a => a.id === id);
            if (ann) this.setAudited([id], !ann.audited);
        }));
        this.tableEl.querySelectorAll('tr[data-id]').forEach(tr => {
            tr.addEventListener('click', (e: any) => {
                const id = (tr as HTMLElement).getAttribute('data-id');
                if (!id) return;
                // metaKey as well as ctrlKey: this runs in a browser, and on a
                // Mac ctrl-click is the context menu.
                const ctrl = e.ctrlKey || e.metaKey, shift = e.shiftKey;
                // Clicking the NUMBER of the balloon that is already selected
                // edits it, like renaming a file. A double-click is not enough
                // on its own: in the workspace rail the first click selects the
                // row, the property panel above it changes height, and the row
                // is somewhere else by the second click (127px, measured).
                const numCell = (e.target as HTMLElement)?.closest?.('[data-num-edit]') as HTMLElement | null;
                if (numCell && !ctrl && !shift
                    && this.selectedIds.size === 1 && this.selectedIds.has(id)) {
                    this.editNumberInline(numCell, e);
                    return;
                }
                // A plain click on another page's row goes to that page, as in
                // One Supply. Ctrl/shift only change the selection, so a set can
                // span pages for a batch edit.
                const page = Number((tr as HTMLElement).getAttribute('data-page'));
                if (!ctrl && !shift && Number.isFinite(page) && page !== this.currentPage)
                    this.setPage(page);
                this.selectAnnotationWithModifiers(id, {ctrl, shift});
            });
        });
        // Double-click a number to change it in place. Enter or leaving the
        // box applies it, Escape puts it back. Children and the second and
        // later lines of a 4X balloon carry no number of their own, so they
        // are not offered this.
        //
        // Delegated to the list container, and bound once per container. The
        // first click of a double-click selects the row, which re-renders the
        // list, so a listener on the cell itself belongs to a node that is
        // already gone by the second click - the browser never fires dblclick
        // on it. The container is not replaced by a re-render.
        if (!this.tableEl.dataset.numEditBound) {
            this.tableEl.dataset.numEditBound = '1';
            this.tableEl.addEventListener('dblclick', (e: any) => {
                const td = (e.target as HTMLElement)?.closest?.('[data-num-edit]') as HTMLElement | null;
                if (td) this.editNumberInline(td, e);
            });
        }

        // Shift-clicking a table row otherwise selects the page's text as well
        // as the rows, which looks like a rendering fault. The same for the
        // second click of a double-click, which would select the word.
        this.tableEl.querySelectorAll('tr[data-id]').forEach(tr =>
            tr.addEventListener('mousedown', (e: any) => {
                if (e.shiftKey || e.detail > 1) e.preventDefault();
            }));

        const scope = this.tableEl.querySelector('.ab-table-scope') as HTMLSelectElement | null;
        scope?.addEventListener('change', () => {
            if (scope.value === 'all') {
                this.tableAllPages = true;
                writePref('dsrfq.ballooning.listAllPages', true);
                this.renderTable();
                return;
            }
            const page = Number(scope.value);
            this.tableAllPages = false;
            writePref('dsrfq.ballooning.listAllPages', false);
            if (Number.isFinite(page) && page !== this.currentPage) this.setPage(page);
            else this.renderTable();
        });

        const images = this.tableEl.querySelector('.ab-table-images') as HTMLInputElement | null;
        images?.addEventListener('change', () => {
            this.tableImages = images.checked;
            writePref('dsrfq.ballooning.listImages', images.checked);
            this.renderTable();
        });

        const filter = this.tableEl.querySelector('.ab-table-filter') as HTMLInputElement | null;
        if (filter) {
            filter.addEventListener('input', () => {
                this.tableFilter = filter.value;
                this.renderTable();
            });
            filter.addEventListener('keydown', e => {
                if (e.key === 'Escape' && filter.value) {
                    e.stopPropagation();
                    this.tableFilter = '';
                    this.renderTable();
                }
            });
            // The table is rebuilt on every keystroke; hand the caret back.
            if (hadFocus) {
                filter.focus();
                const at = caret ?? filter.value.length;
                filter.setSelectionRange(at, at);
            }
        }

        // Back where the operator had it. The list is replaced wholesale on
        // every render - a row click, an audit tick, a field typed in the
        // property panel - and a new scroll box starts at the top; only a
        // CHANGE of selection used to scroll it anywhere afterwards, so the
        // rest sent the operator back to balloon 1 from wherever they were.
        // Put back now, and again next frame: a list rebuilt in a container
        // that is not laid out yet cannot take a scroll position until it is.
        // The follow-the-selection step below then moves it only as far as it
        // has to.
        const wrap = this.tableEl.querySelector('.ab-table-wrapper') as HTMLElement | null;
        if (wrap) {
            const restore = () => {
                wrap.scrollTop = this.tableScrollTop;
                wrap.scrollLeft = this.tableScrollLeft;
            };
            restore();
            requestAnimationFrame(() => {
                // Only if nothing scrolled it since - the selection follow
                // below, or the operator.
                if (wrap.isConnected && wrap.scrollTop === 0 && this.tableScrollTop > 0) restore();
            });
            wrap.addEventListener('scroll', () => {
                // A box not laid out reports 0; that is not the operator
                // scrolling to the top, and must not wipe the position.
                if (!wrap.isConnected || wrap.clientHeight === 0) return;
                this.tableScrollTop = wrap.scrollTop;
                this.tableScrollLeft = wrap.scrollLeft;
            }, {passive: true});
        }

        // Follow a selection made on the drawing: a balloon clicked there is
        // useless to the list if its row is forty lines down. Only when the
        // selection changes, so the operator's own scrolling is left alone.
        if (this.selectedId && this.selectedId !== this.tableScrolledTo) {
            const row = this.tableEl.querySelector(`tr[data-id="${CSS.escape(this.selectedId)}"]`);
            row?.scrollIntoView({block: 'nearest'});
        }
        this.tableScrolledTo = this.selectedId;
    }
}
