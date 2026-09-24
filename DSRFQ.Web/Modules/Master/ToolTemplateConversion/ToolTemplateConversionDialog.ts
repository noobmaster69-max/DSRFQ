import { Decorators, EntityDialog, confirmDialog } from '@serenity-is/corelib';
import {
    ToolTemplateConversionForm,
    ToolTemplateConversionRow,
    ToolTemplateConversionService,
} from '../../ServerTypes/Master';

/**
 * Drawing-conversion template builder.
 *
 * The eleven title-block fields are positioned by dragging boxes over the
 * uploaded table artwork rather than by typing 44 numbers. Boxes are held in
 * normalised 0..1 coordinates so the overlay survives the canvas being scaled
 * down to fit, and are written to the form as pixels in the image's own
 * resolution -- that is the unit DrawingConversion.generate_filled_template
 * expects, and what function.py's TEMPLATE_COORDS used to hardcode.
 */

interface FieldDef {
    key: string;
    label: string;
    color: string;
    x1: keyof ToolTemplateConversionRow;
    y1: keyof ToolTemplateConversionRow;
    x2: keyof ToolTemplateConversionRow;
    y2: keyof ToolTemplateConversionRow;
}

const FIELD_DEFS: FieldDef[] = [
    { key: 'Revision',         label: 'Revision',          color: '#e74c3c', x1: 'RevisionX1',         y1: 'RevisionY1',         x2: 'RevisionX2',         y2: 'RevisionY2'         },
    { key: 'PartNumber',       label: 'Part Number',       color: '#3498db', x1: 'PartNumberX1',       y1: 'PartNumberY1',       x2: 'PartNumberX2',       y2: 'PartNumberY2'       },
    { key: 'Description',      label: 'Description',       color: '#2ecc71', x1: 'DescriptionX1',      y1: 'DescriptionY1',      x2: 'DescriptionX2',      y2: 'DescriptionY2'      },
    { key: 'Material',         label: 'Material',          color: '#f39c12', x1: 'MaterialX1',         y1: 'MaterialY1',         x2: 'MaterialX2',         y2: 'MaterialY2'         },
    { key: 'Weight',           label: 'Weight',            color: '#9b59b6', x1: 'WeightX1',           y1: 'WeightY1',           x2: 'WeightX2',           y2: 'WeightY2'           },
    { key: 'AngularTolerance', label: 'Angular Tolerance', color: '#1abc9c', x1: 'AngularToleranceX1', y1: 'AngularToleranceY1', x2: 'AngularToleranceX2', y2: 'AngularToleranceY2' },
    { key: 'Surface',          label: 'Surface',           color: '#e67e22', x1: 'SurfaceX1',          y1: 'SurfaceY1',          x2: 'SurfaceX2',          y2: 'SurfaceY2'          },
    { key: 'Tolerance1',       label: 'Tolerance 1',       color: '#e91e63', x1: 'Tolerance1X1',       y1: 'Tolerance1Y1',       x2: 'Tolerance1X2',       y2: 'Tolerance1Y2'       },
    { key: 'Tolerance2',       label: 'Tolerance 2',       color: '#00bcd4', x1: 'Tolerance2X1',       y1: 'Tolerance2Y1',       x2: 'Tolerance2X2',       y2: 'Tolerance2Y2'       },
    { key: 'Tolerance3',       label: 'Tolerance 3',       color: '#8bc34a', x1: 'Tolerance3X1',       y1: 'Tolerance3Y1',       x2: 'Tolerance3X2',       y2: 'Tolerance3Y2'       },
    { key: 'Tolerance4',       label: 'Tolerance 4',       color: '#ff9800', x1: 'Tolerance4X1',       y1: 'Tolerance4Y1',       x2: 'Tolerance4X2',       y2: 'Tolerance4Y2'       },
];

/** A box in normalised image coordinates: 0..1 on both axes. */
interface DrawnBox {
    fieldKey: string;
    x1: number; y1: number; x2: number; y2: number;
}

/** Coordinates read off the entity before the image told us its resolution. */
interface PendingBox {
    fieldKey: string;
    px1: number; py1: number; px2: number; py2: number;
}

const STYLE_ID = 'ttc-style';

// Every colour is derived from --bs-body-color, --bs-body-bg and
// --bs-border-color, which are the only Bootstrap variables all three installed
// themes actually redefine. --bs-tertiary-bg and --bs-secondary-bg are NOT
// redefined by theme-cosmos-dark: using them for a surface paints a light grey
// panel behind the theme's light text. Mixing against the body colour instead
// gives a surface that is automatically darker on light themes and lighter on
// dark ones, with no per-theme override to keep in sync.
//
// The field colours above stay fixed: they are identity, not chrome, and are
// painted onto the artwork rather than onto the page.
const STYLE = `
<style id="${STYLE_ID}">
.ttc-root {
    --ttc-text:          var(--bs-body-color, #1f2937);
    --ttc-panel:         var(--bs-body-bg, #ffffff);
    --ttc-border:        var(--bs-border-color, #e5e7eb);
    --ttc-primary:       var(--bs-primary, #2563eb);
    --ttc-danger:        var(--bs-danger, #dc2626);

    --ttc-muted:         color-mix(in srgb, var(--ttc-text) 62%, transparent);
    --ttc-bg:            color-mix(in srgb, var(--ttc-text) 6%, var(--ttc-panel));
    --ttc-stage:         color-mix(in srgb, var(--ttc-text) 10%, var(--ttc-panel));
    --ttc-danger-bg:     color-mix(in srgb, var(--ttc-danger) 12%, transparent);
    --ttc-danger-border: color-mix(in srgb, var(--ttc-danger) 35%, transparent);
    --ttc-active-bg:     color-mix(in srgb, var(--ttc-primary) 14%, transparent);
    --ttc-active-color:  var(--ttc-primary);
    --ttc-active-border: color-mix(in srgb, var(--ttc-primary) 40%, transparent);
    box-sizing: border-box;
    color: var(--ttc-text);
}
.ttc-root *, .ttc-root *::before, .ttc-root *::after { box-sizing: inherit; }

.ttc-wrap {
    margin-top: 12px;
    border: 1px solid var(--ttc-border);
    border-radius: 8px;
    overflow: hidden;
    background: var(--ttc-panel);
    box-shadow: 0 1px 3px rgba(0,0,0,.08);
}

/* Toolbar */
.ttc-toolbar {
    display: flex;
    align-items: center;
    height: 52px;
    padding: 0 12px;
    background: var(--ttc-panel);
    border-bottom: 1px solid var(--ttc-border);
    overflow-x: auto;
    white-space: nowrap;
    gap: 0;
}
.ttc-toolbar-group {
    display: flex;
    align-items: center;
    gap: 6px;
    padding-right: 12px;
    margin-right: 12px;
    border-right: 1px solid var(--ttc-border);
    flex-shrink: 0;
    height: 100%;
}
.ttc-toolbar-group:last-child { border-right: none; margin-right: 0; }
.ttc-toolbar label {
    color: var(--ttc-muted);
    font-size: 11px;
    font-weight: 500;
    margin: 0;
}
.ttc-toolbar select {
    padding: 4px 8px;
    background: var(--ttc-panel);
    color: var(--ttc-text);
    border: 1px solid var(--ttc-border);
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    min-width: 150px;
    outline: none;
}
.ttc-toolbar select:focus { border-color: var(--ttc-primary); }

/* Buttons */
.ttc-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 11px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid transparent;
    background: transparent;
    color: var(--ttc-muted);
    transition: background .15s, border-color .15s, color .15s;
    white-space: nowrap;
    flex-shrink: 0;
}
.ttc-btn:hover:not(:disabled) {
    background: var(--ttc-bg);
    border-color: var(--ttc-border);
    color: var(--ttc-text);
}
.ttc-btn:disabled { opacity: .5; cursor: not-allowed; }
.ttc-btn-danger { background: var(--ttc-danger-bg); color: var(--ttc-danger); border-color: var(--ttc-danger-border); }
.ttc-btn-danger:hover:not(:disabled) { background: var(--ttc-danger-bg); color: var(--ttc-danger); }
.ttc-status { font-size: 11px; color: var(--ttc-muted); margin-left: auto; flex-shrink: 0; }

/* Viewport */
.ttc-viewport {
    position: relative;
    background: var(--ttc-stage);
    min-height: 420px;
    max-height: 600px;
    overflow: auto;
    line-height: 0;
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: center;
}
.ttc-canvas { display: block; cursor: crosshair; max-width: 100%; box-shadow: 0 4px 12px rgba(0,0,0,.1); }
.ttc-no-image {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: var(--ttc-muted);
    font-size: 13px;
    padding: 60px 0;
    pointer-events: none;
    text-align: center;
}
.ttc-no-image svg { width: 52px; height: 52px; opacity: .35; }

/* Legend */
.ttc-legend {
    padding: 10px 14px;
    background: var(--ttc-panel);
    border-top: 1px solid var(--ttc-border);
}
.ttc-legend-title {
    font-size: 10px;
    font-weight: 700;
    color: var(--ttc-muted);
    text-transform: uppercase;
    letter-spacing: .7px;
    margin-bottom: 8px;
}
.ttc-legend-rows { display: flex; flex-wrap: wrap; gap: 6px; }
.ttc-legend-item {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px 3px 6px;
    border-radius: 20px;
    border: 1px solid var(--ttc-border);
    background: var(--ttc-bg);
    font-size: 11px;
    font-weight: 500;
    color: var(--ttc-text);
    cursor: pointer;
    transition: background .15s, border-color .15s;
}
.ttc-legend-item:hover { background: var(--ttc-active-bg); border-color: var(--ttc-active-border); }
.ttc-legend-item.ttc-selected { background: var(--ttc-active-bg); border-color: var(--ttc-active-border); color: var(--ttc-active-color); }
.ttc-legend-swatch { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.ttc-legend-coords { color: var(--ttc-muted); font-size: 10px; font-family: monospace; margin-left: 2px; }
.ttc-empty-legend { font-size: 11px; color: var(--ttc-muted); font-style: italic; }
</style>
`;

@Decorators.registerClass('DSRFQ.Master.ToolTemplateConversionDialog')
export class ToolTemplateConversionDialog extends EntityDialog<ToolTemplateConversionRow, any> {
    protected getFormKey() { return ToolTemplateConversionForm.formKey; }
    protected getRowDefinition() { return ToolTemplateConversionRow; }
    protected getService() { return ToolTemplateConversionService.baseUrl; }

    protected form = new ToolTemplateConversionForm(this.idPrefix);

    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private baseImg: HTMLImageElement | null = null;
    private loadedSrc: string | null = null;
    private naturalW = 0;
    private naturalH = 0;
    private drawnBoxes: DrawnBox[] = [];
    private pendingEntityBoxes: PendingBox[] = [];
    private selectedFieldKey: string = FIELD_DEFS[0].key;
    private selectedBoxKey: string | null = null;
    private isDragging = false;
    private dragStart = { x: 0, y: 0 };
    private dragCurrent = { x: 0, y: 0 };
    private imageObserver: MutationObserver | null = null;
    private wrapEl: HTMLElement | null = null;
    private noImageEl: HTMLElement | null = null;
    private legendRowsEl: HTMLElement | null = null;
    private statusEl: HTMLElement | null = null;
    private fieldSelectEl: HTMLSelectElement | null = null;

    protected afterLoadEntity() {
        super.afterLoadEntity();
        this.ensureEditorUI();
        this.loadBoxesFromEntity();
        this.syncImageFromForm();
    }

    destroy() {
        this.imageObserver?.disconnect();
        this.imageObserver = null;
        super.destroy();
    }

    // -- Build UI ------------------------------------------------------------
    private ensureEditorUI() {
        if (this.wrapEl) return;

        if (!document.getElementById(STYLE_ID))
            document.head.insertAdjacentHTML('beforeend', STYLE);

        const formEl = this.propertyGrid?.domNode
            ?? this.domNode.querySelector('.s-Form') as HTMLElement | null;
        if (!formEl) return;

        const wrap = document.createElement('div');
        wrap.className = 'ttc-root ttc-wrap';
        formEl.after(wrap);
        this.wrapEl = wrap;

        wrap.append(this.buildToolbar(), this.buildViewport(), this.buildLegend());

        this.watchTableUpload();
        this.refreshLegend();
    }

    private buildToolbar(): HTMLElement {
        const toolbar = document.createElement('div');
        toolbar.className = 'ttc-toolbar';

        const fieldGroup = document.createElement('div');
        fieldGroup.className = 'ttc-toolbar-group';
        const label = document.createElement('label');
        label.textContent = 'Field:';

        const select = document.createElement('select');
        for (const f of FIELD_DEFS) {
            const opt = document.createElement('option');
            opt.value = f.key;
            opt.textContent = f.label;
            select.appendChild(opt);
        }
        select.value = this.selectedFieldKey;
        select.addEventListener('change', () => {
            this.selectedFieldKey = select.value;
            this.selectedBoxKey = null;
            this.redraw();
            this.refreshLegend();
        });
        this.fieldSelectEl = select;
        fieldGroup.append(label, select);

        const actionGroup = document.createElement('div');
        actionGroup.className = 'ttc-toolbar-group';

        const btnClear = document.createElement('button');
        btnClear.type = 'button';
        btnClear.className = 'ttc-btn ttc-btn-danger';
        btnClear.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg> Clear All`;
        btnClear.addEventListener('click', () => {
            confirmDialog('Clear all drawn boxes?', () => {
                this.drawnBoxes = [];
                this.selectedBoxKey = null;
                this.writeBoxesToForm();
                this.redraw();
                this.refreshLegend();
                this.setStatus('All boxes cleared.');
            });
        });

        const btnDelete = document.createElement('button');
        btnDelete.type = 'button';
        btnDelete.className = 'ttc-btn';
        btnDelete.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Delete Selected`;
        btnDelete.addEventListener('click', () => {
            if (!this.selectedBoxKey) return;
            this.drawnBoxes = this.drawnBoxes.filter(b => b.fieldKey !== this.selectedBoxKey);
            this.clearFormFieldForKey(this.selectedBoxKey);
            this.selectedBoxKey = null;
            this.redraw();
            this.refreshLegend();
        });

        actionGroup.append(btnClear, btnDelete);

        const statusGroup = document.createElement('div');
        statusGroup.className = 'ttc-toolbar-group';
        statusGroup.style.border = 'none';
        const status = document.createElement('span');
        status.className = 'ttc-status';
        status.textContent = 'Drag on image to draw a box';
        this.statusEl = status;
        statusGroup.appendChild(status);

        toolbar.append(fieldGroup, actionGroup, statusGroup);
        return toolbar;
    }

    private buildViewport(): HTMLElement {
        const viewport = document.createElement('div');
        viewport.className = 'ttc-viewport';

        const noImg = document.createElement('div');
        noImg.className = 'ttc-no-image';
        noImg.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>Upload an image in the <strong>Table</strong> field above to start drawing</span>`;
        this.noImageEl = noImg;
        viewport.appendChild(noImg);

        const canvas = document.createElement('canvas');
        canvas.className = 'ttc-canvas';
        canvas.style.display = 'none';
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        viewport.appendChild(canvas);

        canvas.addEventListener('mousedown', e => this.onMouseDown(e));
        canvas.addEventListener('mousemove', e => this.onMouseMove(e));
        canvas.addEventListener('mouseup', e => this.onMouseUp(e));
        canvas.addEventListener('mouseleave', () => { this.isDragging = false; this.redraw(); });

        return viewport;
    }

    private buildLegend(): HTMLElement {
        const legend = document.createElement('div');
        legend.className = 'ttc-legend';

        const title = document.createElement('div');
        title.className = 'ttc-legend-title';
        title.textContent = 'Drawn Boxes';

        const rows = document.createElement('div');
        rows.className = 'ttc-legend-rows';
        this.legendRowsEl = rows;

        legend.append(title, rows);
        return legend;
    }

    // -- Image ---------------------------------------------------------------
    /** The uploaded file name currently held by the TablePicture editor. */
    private currentTableFilename(): string | null {
        const editor = (this.form as any)['TablePicture'];
        const value = editor?.value;
        return value?.Filename || null;
    }

    /**
     * Point the canvas at whatever the TablePicture editor currently holds.
     * Reloading the same file would restart the decode and flash the canvas, so
     * an unchanged source is left alone.
     */
    private syncImageFromForm() {
        const filename = this.currentTableFilename();
        if (!filename) {
            this.loadedSrc = null;
            this.showNoImage();
            return;
        }
        this.loadImageOntoCanvas('/upload/' + filename);
    }

    private watchTableUpload() {
        const editorHost = (this.form as any)['TablePicture']?.domNode as HTMLElement | undefined;
        const uploadArea = (editorHost ?? this.domNode.querySelector(`#${this.idPrefix}TablePicture`))
            ?.closest('.field') as HTMLElement | null;
        if (!uploadArea) return;

        const tryLoad = () => {
            // A freshly uploaded file is still a temporary blob, so the editor
            // value is not usable yet; the thumbnail the widget inserts is.
            const img = uploadArea.querySelector('img') as HTMLImageElement | null;
            const src = img?.getAttribute('src');
            if (src && (src.includes('/upload/') || src.startsWith('blob:'))) {
                this.loadImageOntoCanvas(src);
                return;
            }
            this.syncImageFromForm();
        };

        this.imageObserver = new MutationObserver(tryLoad);
        this.imageObserver.observe(uploadArea, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['src', 'value'],
        });

        uploadArea.querySelectorAll('input[type="hidden"]')
            .forEach(inp => inp.addEventListener('change', tryLoad));

        tryLoad();
    }

    private loadImageOntoCanvas(src: string) {
        if (src === this.loadedSrc) return;
        this.loadedSrc = src;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            if (!this.canvas || this.loadedSrc !== src) return;
            this.naturalW = img.naturalWidth;
            this.naturalH = img.naturalHeight;
            this.baseImg = img;

            // Cap the drawing surface: title-block artwork runs to several
            // thousand pixels wide and would otherwise overflow the dialog.
            const maxW = 900;
            const scale = this.naturalW > maxW ? maxW / this.naturalW : 1;
            this.canvas.width = Math.round(this.naturalW * scale);
            this.canvas.height = Math.round(this.naturalH * scale);

            this.canvas.style.display = 'block';
            if (this.noImageEl) this.noImageEl.style.display = 'none';

            this.normalizePendingBoxes();
            this.redraw();
            this.refreshLegend();
            this.setStatus(`Image loaded (${this.naturalW}×${this.naturalH}). Drag to draw boxes.`);
        };
        img.onerror = () => {
            if (this.loadedSrc === src) this.showNoImage();
        };
        img.src = src;
    }

    /**
     * Entity coordinates are pixels, but we only learn the resolution to divide
     * by once the image has decoded, so they wait here until it does.
     */
    private normalizePendingBoxes() {
        if (this.pendingEntityBoxes.length === 0) return;
        const w = this.naturalW || 1;
        const h = this.naturalH || 1;
        this.drawnBoxes = this.pendingEntityBoxes.map(p => ({
            fieldKey: p.fieldKey,
            x1: p.px1 / w, y1: p.py1 / h, x2: p.px2 / w, y2: p.py2 / h,
        }));
        this.pendingEntityBoxes = [];
    }

    private showNoImage() {
        this.baseImg = null;
        this.naturalW = 0;
        this.naturalH = 0;
        if (this.canvas) this.canvas.style.display = 'none';
        if (this.noImageEl) this.noImageEl.style.display = '';
        this.setStatus('No image loaded.');
    }

    private setStatus(msg: string) {
        if (this.statusEl) this.statusEl.textContent = msg;
    }

    // -- Entity <-> boxes -----------------------------------------------------
    private loadBoxesFromEntity() {
        this.drawnBoxes = [];
        this.pendingEntityBoxes = [];
        const e = this.entity as ToolTemplateConversionRow;
        if (!e) return;

        for (const f of FIELD_DEFS) {
            const x1 = e[f.x1] as number | null | undefined;
            const y1 = e[f.y1] as number | null | undefined;
            const x2 = e[f.x2] as number | null | undefined;
            const y2 = e[f.y2] as number | null | undefined;
            if (x1 == null || y1 == null || x2 == null || y2 == null)
                continue;

            if (this.naturalW > 0) {
                this.drawnBoxes.push({
                    fieldKey: f.key,
                    x1: Number(x1) / this.naturalW, y1: Number(y1) / this.naturalH,
                    x2: Number(x2) / this.naturalW, y2: Number(y2) / this.naturalH,
                });
            } else {
                this.pendingEntityBoxes.push({
                    fieldKey: f.key,
                    px1: Number(x1), py1: Number(y1), px2: Number(x2), py2: Number(y2),
                });
            }
        }

        this.redraw();
        this.refreshLegend();
    }

    private writeBoxesToForm() {
        for (const f of FIELD_DEFS)
            this.clearFormFieldForKey(f.key);

        const sx = this.naturalW || 1;
        const sy = this.naturalH || 1;
        for (const box of this.drawnBoxes) {
            const def = FIELD_DEFS.find(f => f.key === box.fieldKey);
            if (!def) continue;
            this.setFormValue(def.x1, box.x1 * sx);
            this.setFormValue(def.y1, box.y1 * sy);
            this.setFormValue(def.x2, box.x2 * sx);
            this.setFormValue(def.y2, box.y2 * sy);
        }
    }

    private clearFormFieldForKey(fieldKey: string) {
        const def = FIELD_DEFS.find(f => f.key === fieldKey);
        if (!def) return;
        for (const k of [def.x1, def.y1, def.x2, def.y2])
            this.setFormValue(k, null);
    }

    private setFormValue(fieldName: keyof ToolTemplateConversionRow, value: number | null) {
        const editor = (this.form as any)[fieldName];
        if (!editor) return;
        try {
            editor.set_value(value == null ? '' : String(Math.round(value * 100) / 100));
        } catch {
            /* a hidden editor that will not take the value is not worth failing the drag over */
        }
    }

    // -- Canvas ---------------------------------------------------------------
    private redraw() {
        if (!this.canvas || !this.ctx) return;
        const ctx = this.ctx;
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        ctx.clearRect(0, 0, cw, ch);
        if (this.baseImg) {
            ctx.drawImage(this.baseImg, 0, 0, cw, ch);
        } else {
            ctx.fillStyle = '#f3f4f6';
            ctx.fillRect(0, 0, cw, ch);
        }

        for (const box of this.drawnBoxes) {
            const def = FIELD_DEFS.find(f => f.key === box.fieldKey);
            if (!def) continue;
            this.drawBox(ctx, cw, ch, box, def.color, def.label, this.selectedBoxKey === box.fieldKey);
        }

        if (this.isDragging) {
            const color = FIELD_DEFS.find(f => f.key === this.selectedFieldKey)?.color ?? '#2563eb';
            const { x, y, w, h } = this.getRubberBandRect();
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 3]);
            ctx.strokeRect(x, y, w, h);
            ctx.fillStyle = color + '22';
            ctx.fillRect(x, y, w, h);
            ctx.restore();
        }
    }

    private drawBox(ctx: CanvasRenderingContext2D, cw: number, ch: number,
        box: DrawnBox, color: string, label: string, isSelected: boolean) {
        const x = box.x1 * cw;
        const y = box.y1 * ch;
        const w = (box.x2 - box.x1) * cw;
        const h = (box.y2 - box.y1) * ch;

        ctx.save();
        ctx.fillStyle = color + '28';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = color;
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.setLineDash([]);
        ctx.strokeRect(x, y, w, h);

        if (isSelected) {
            for (const [cx, cy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(cx, cy, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        }

        const fontSize = 11;
        ctx.font = `600 ${fontSize}px "Segoe UI", sans-serif`;
        const textW = ctx.measureText(label).width + 10;
        const textH = fontSize + 6;
        ctx.fillStyle = color;
        const pillW = Math.min(textW, w || textW);
        ctx.beginPath();
        if (typeof (ctx as any).roundRect === 'function')
            (ctx as any).roundRect(x, y - textH, pillW, textH, 3);
        else
            ctx.rect(x, y - textH, pillW, textH);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, x + 5, y - textH + fontSize + 1);
        ctx.restore();
    }

    private getRubberBandRect() {
        return {
            x: Math.min(this.dragStart.x, this.dragCurrent.x),
            y: Math.min(this.dragStart.y, this.dragCurrent.y),
            w: Math.abs(this.dragCurrent.x - this.dragStart.x),
            h: Math.abs(this.dragCurrent.y - this.dragStart.y),
        };
    }

    /** Client coordinates to canvas pixels, accounting for the CSS downscale. */
    private getCanvasPos(e: MouseEvent): { x: number; y: number } {
        const rect = this.canvas!.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (this.canvas!.width / rect.width),
            y: (e.clientY - rect.top) * (this.canvas!.height / rect.height),
        };
    }

    private onMouseDown(e: MouseEvent) {
        if (!this.canvas || this.canvas.style.display === 'none') return;
        e.preventDefault();
        this.isDragging = true;
        this.dragStart = this.dragCurrent = this.getCanvasPos(e);
    }

    private onMouseMove(e: MouseEvent) {
        if (!this.isDragging) return;
        this.dragCurrent = this.getCanvasPos(e);
        this.redraw();
    }

    private onMouseUp(e: MouseEvent) {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.dragCurrent = this.getCanvasPos(e);

        const cw = this.canvas!.width;
        const ch = this.canvas!.height;
        const nx1 = Math.min(this.dragStart.x, this.dragCurrent.x) / cw;
        const ny1 = Math.min(this.dragStart.y, this.dragCurrent.y) / ch;
        const nx2 = Math.max(this.dragStart.x, this.dragCurrent.x) / cw;
        const ny2 = Math.max(this.dragStart.y, this.dragCurrent.y) / ch;

        // A click, or a slip of a few pixels, is not an attempt to draw a box.
        const minSize = 5 / Math.max(cw, ch);
        if ((nx2 - nx1) < minSize || (ny2 - ny1) < minSize) {
            this.redraw();
            return;
        }

        // One box per field: drawing again replaces the previous position.
        this.drawnBoxes = this.drawnBoxes.filter(b => b.fieldKey !== this.selectedFieldKey);
        this.drawnBoxes.push({ fieldKey: this.selectedFieldKey, x1: nx1, y1: ny1, x2: nx2, y2: ny2 });
        this.selectedBoxKey = this.selectedFieldKey;

        this.writeBoxesToForm();
        this.redraw();
        this.refreshLegend();
        this.setStatus(`"${FIELD_DEFS.find(f => f.key === this.selectedFieldKey)?.label}" box saved.`);
    }

    // -- Legend ---------------------------------------------------------------
    private refreshLegend() {
        if (!this.legendRowsEl) return;
        this.legendRowsEl.replaceChildren();

        if (this.drawnBoxes.length === 0) {
            const empty = document.createElement('span');
            empty.className = 'ttc-empty-legend';
            empty.textContent = 'No boxes drawn yet.';
            this.legendRowsEl.appendChild(empty);
            return;
        }

        const sx = this.naturalW || 1;
        const sy = this.naturalH || 1;

        for (const def of FIELD_DEFS) {
            const box = this.drawnBoxes.find(b => b.fieldKey === def.key);
            if (!box) continue;

            const item = document.createElement('div');
            item.className = 'ttc-legend-item' + (this.selectedBoxKey === def.key ? ' ttc-selected' : '');

            const swatch = document.createElement('span');
            swatch.className = 'ttc-legend-swatch';
            swatch.style.background = def.color;

            const name = document.createElement('span');
            name.textContent = def.label;

            const coords = document.createElement('span');
            coords.className = 'ttc-legend-coords';
            coords.textContent = `(${Math.round(box.x1 * sx)},${Math.round(box.y1 * sy)})–(${Math.round(box.x2 * sx)},${Math.round(box.y2 * sy)})`;

            item.append(swatch, name, coords);
            item.addEventListener('click', () => {
                this.selectedBoxKey = this.selectedBoxKey === def.key ? null : def.key;
                if (this.selectedBoxKey && this.fieldSelectEl) {
                    this.fieldSelectEl.value = this.selectedBoxKey;
                    this.selectedFieldKey = this.selectedBoxKey;
                }
                this.redraw();
                this.refreshLegend();
            });

            this.legendRowsEl.appendChild(item);
        }
    }
}
