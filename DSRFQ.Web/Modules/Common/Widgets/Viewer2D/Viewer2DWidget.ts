import panzoom, {PanZoom} from "panzoom";

export interface Viewer2DPage {
    /** Upload-relative path of the page image. */
    fileDirectory: string;
    /** 1-based page number as stored on CostingPartDocumentImages. */
    page: number;
}

/**
 * The 2D mode of the costing workspace stage.
 *
 * Replaces the bootstrap carousel the result dialog used. That carousel built a
 * fresh Zoomist per slide and re-created it on every `slide.bs.carousel`, which
 * meant zoom and pan were lost on each page change and instances leaked. Here a
 * single panzoom instance drives one <img>, and paging swaps the source.
 *
 * The transform is deliberately exposed: ballooning mode renders its overlay on
 * top of this same image and must share the transform exactly, otherwise the
 * balloons drift away from the geometry they annotate.
 */
export class Viewer2DWidget {
    private host: HTMLElement;
    private stageEl!: HTMLElement;
    private surfaceEl!: HTMLElement;
    private imgEl!: HTMLImageElement;
    private overlayEl!: HTMLElement;
    private pz: PanZoom | null = null;

    private pages: Viewer2DPage[] = [];
    private current = 0;
    /** Fired after a page change so an overlay can re-draw for the new page. */
    private onPageChanged: ((index: number) => void) | null = null;

    constructor(host: HTMLElement) {
        this.host = host;
        this.renderShell();
    }

    // ─── Public surface ──────────────────────────────────────────────────

    public get pageCount(): number { return this.pages.length; }
    public get pageIndex(): number { return this.current; }
    public hasPages(): boolean { return this.pages.length > 0; }

    /** The element an annotation overlay should draw into. Shares the transform. */
    public getOverlayHost(): HTMLElement { return this.overlayEl; }

    /** Natural pixel size of the loaded page, or null before it decodes. */
    public getNaturalSize(): { width: number; height: number } | null {
        if (!this.imgEl.naturalWidth) return null;
        return { width: this.imgEl.naturalWidth, height: this.imgEl.naturalHeight };
    }

    public setPages(pages: Viewer2DPage[]) {
        this.pages = pages ?? [];
        this.current = 0;
        this.renderPage();
        this.renderThumbs();
    }

    public setPage(index: number) {
        if (index < 0 || index >= this.pages.length || index === this.current) return;
        this.current = index;
        this.renderPage();
        this.paintThumbSelection();
        this.onPageChanged?.(index);
    }

    public onPageChange(handler: (index: number) => void) {
        this.onPageChanged = handler;
    }

    public zoomBy(factor: number) {
        if (!this.pz) return;
        const rect = this.stageEl.getBoundingClientRect();
        this.pz.smoothZoom(rect.width / 2, rect.height / 2, factor);
    }

    /** Scales the page to fit the stage and centres it. */
    public fit() {
        if (!this.pz || !this.imgEl.naturalWidth) return;
        const stage = this.stageEl.getBoundingClientRect();
        if (!stage.width || !stage.height) return;

        const scale = Math.min(
            stage.width / this.imgEl.naturalWidth,
            stage.height / this.imgEl.naturalHeight) * 0.96;

        this.pz.zoomAbs(0, 0, scale);
        this.pz.moveTo(
            (stage.width - this.imgEl.naturalWidth * scale) / 2,
            (stage.height - this.imgEl.naturalHeight * scale) / 2);
    }

    /**
     * Called when 2D becomes the visible mode. panzoom measures its parent, so a
     * viewer built behind a hidden pane has no usable geometry until now.
     */
    public resize() {
        if (this.imgEl.naturalWidth) this.fit();
    }

    public destroy() {
        this.pz?.dispose();
        this.pz = null;
    }

    // ─── Rendering ───────────────────────────────────────────────────────

    private renderShell() {
        this.host.innerHTML = `
            <div class="v2-root">
                <div class="v2-stage">
                    <div class="v2-surface">
                        <img class="v2-image" alt="" draggable="false" />
                        <div class="v2-overlay"></div>
                    </div>
                </div>
                <div class="v2-empty">
                    <p class="v2-empty-title">No pages to show</p>
                    <p class="v2-empty-sub">This document has no converted page images yet.</p>
                </div>
                <div class="v2-thumbs"></div>
            </div>`;

        this.stageEl = this.host.querySelector('.v2-stage')!;
        this.surfaceEl = this.host.querySelector('.v2-surface')!;
        this.imgEl = this.host.querySelector('.v2-image')!;
        this.overlayEl = this.host.querySelector('.v2-overlay')!;

        // Fit once the bitmap is decoded — naturalWidth is 0 until then.
        this.imgEl.addEventListener('load', () => this.fit());
    }

    private ensurePanzoom() {
        if (this.pz) return;
        this.pz = panzoom(this.surfaceEl, {
            maxZoom: 20,
            minZoom: 0.05,
            zoomDoubleClickSpeed: 1,   // disable double-click zoom; it fights balloon editing
            smoothScroll: false,
            bounds: false
        });
    }

    private renderPage() {
        const page = this.pages[this.current];
        const empty = this.host.querySelector('.v2-empty') as HTMLElement;

        if (!page) {
            this.stageEl.style.display = 'none';
            empty.style.display = '';
            return;
        }

        this.stageEl.style.display = '';
        empty.style.display = 'none';
        this.ensurePanzoom();
        this.imgEl.src = `/upload/${page.fileDirectory}`;
    }

    private renderThumbs() {
        const el = this.host.querySelector('.v2-thumbs') as HTMLElement;
        if (this.pages.length < 2) {
            el.innerHTML = '';
            el.style.display = 'none';
            return;
        }
        el.style.display = '';
        el.innerHTML = this.pages.map((p, i) => `
            <button class="v2-thumb ${i === this.current ? 'is-active' : ''}" data-page="${i}" title="Page ${p.page}">
                <img src="/upload/${p.fileDirectory}" alt="" loading="lazy" />
                <span>${p.page}</span>
            </button>`).join('');

        el.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', () =>
                this.setPage(Number((btn as HTMLElement).dataset.page)));
        });
    }

    private paintThumbSelection() {
        this.host.querySelectorAll('.v2-thumb').forEach(t => {
            t.classList.toggle('is-active', Number((t as HTMLElement).dataset.page) === this.current);
        });
    }
}
