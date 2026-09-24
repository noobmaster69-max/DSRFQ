import { BaseDialog, Decorators, DialogOptions, localText } from "@serenity-is/corelib";
import { ImageDialogCss } from "./ImageDialogCss";

export interface ImageDialogOptions {
    /** Url of the full size image to display. */
    imageUrl: string;
    /** Dialog title, defaults to the Site.Common.Dialogs.Image local text. */
    title?: string;
}

const MIN_ZOOM = 0.02;
const MAX_ZOOM = 32;
/** Past this the browser's smoothing turns thin drawing lines into mush. */
const PIXELATE_AT = 4;

@Decorators.registerClass("DSRFQ.Common.ImageDialog")
export class ImageDialog extends BaseDialog<ImageDialogOptions> {

    private viewport: HTMLDivElement;
    private image: HTMLImageElement;
    private zoomLabel: HTMLElement;

    /** Current scale, and the "fit to dialog" scale that reset returns to. */
    private zoom = 1;
    private fitZoom = 1;

    protected getInitialDialogTitle() {
        return this.options.title || localText("Site.Common.Dialogs.Image", "Image");
    }

    protected getDialogOptions(): DialogOptions {
        return {
            ...super.getDialogOptions(),
            size: "xl",
            // jQuery UI fallback only; Bootstrap modals size from `size`.
            width: 900
        };
    }

    protected renderContents() {
        if (!document.getElementById("dsrfq-image-dialog-css"))
            document.head.insertAdjacentHTML("beforeend", ImageDialogCss());

        return (<div class="img-dlg">
            <div class="img-dlg-viewport" ref={el => this.viewport = el}
                onWheel={(e: WheelEvent) => this.onWheel(e)}
                onPointerDown={(e: PointerEvent) => this.onPointerDown(e)}>
                <img class="img-dlg-img" ref={el => this.image = el}
                    src={this.options.imageUrl}
                    alt={this.getInitialDialogTitle()}
                    onLoad={() => this.fitToViewport()} />
            </div>
            <div class="img-dlg-tools">
                <button type="button" class="img-dlg-btn"
                    title={localText("Site.Common.Dialogs.ZoomIn", "Zoom in")}
                    onClick={() => this.setZoom(this.nextZoom(1))}>
                    <i class="fa fa-plus"></i>
                </button>
                <button type="button" class="img-dlg-btn"
                    title={localText("Site.Common.Dialogs.ZoomOut", "Zoom out")}
                    onClick={() => this.setZoom(this.nextZoom(-1))}>
                    <i class="fa fa-minus"></i>
                </button>
                <button type="button" class="img-dlg-btn img-dlg-zoom"
                    ref={el => this.zoomLabel = el}
                    title={localText("Site.Common.Dialogs.ResetZoom", "Fit to window")}
                    onClick={() => this.fitToViewport()}>1.00x</button>
            </div>
        </div>);
    }

    protected onDialogOpen() {
        super.onDialogOpen();
        // The viewport has no size until the dialog is on screen, so the fit
        // computed on an early load event would be wrong.
        if (this.image?.complete)
            this.fitToViewport();
    }

    /** Scale the image so the whole of it is visible, and make that the reset point. */
    private fitToViewport() {
        const natWidth = this.image?.naturalWidth;
        const natHeight = this.image?.naturalHeight;
        if (!natWidth || !natHeight)
            return;

        const boxWidth = this.viewport.clientWidth;
        const boxHeight = this.viewport.clientHeight;
        if (!boxWidth || !boxHeight)
            return;

        // Never upscale on open: a 40px thumbnail blown up to fill the dialog
        // is less useful than the same thumbnail at 1:1.
        this.fitZoom = Math.min(1, boxWidth / natWidth, boxHeight / natHeight);
        this.setZoom(this.fitZoom);
    }

    /** One step in or out, coarser as the image gets bigger. */
    private nextZoom(direction: number) {
        const step = this.zoom < 0.05 ? 0.01 : this.zoom < 0.25 ? 0.05 : 0.25;
        return this.zoom + direction * step;
    }

    private setZoom(zoom: number, anchor?: { x: number, y: number }) {
        const natWidth = this.image?.naturalWidth;
        const natHeight = this.image?.naturalHeight;
        if (!natWidth || !natHeight)
            return;

        zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

        // Keep whatever is under `anchor` (a point in viewport coordinates)
        // under it after the resize, so wheel zoom tracks the cursor.
        const box = this.viewport.getBoundingClientRect();
        const offsetX = anchor ? anchor.x - box.left : this.viewport.clientWidth / 2;
        const offsetY = anchor ? anchor.y - box.top : this.viewport.clientHeight / 2;
        const ratio = zoom / this.zoom;
        const scrollLeft = (this.viewport.scrollLeft + offsetX) * ratio - offsetX;
        const scrollTop = (this.viewport.scrollTop + offsetY) * ratio - offsetY;

        this.zoom = zoom;
        this.image.style.width = (natWidth * zoom) + "px";
        this.image.style.height = (natHeight * zoom) + "px";
        this.image.classList.toggle("is-magnified", zoom >= PIXELATE_AT);
        this.viewport.scrollLeft = scrollLeft;
        this.viewport.scrollTop = scrollTop;

        if (this.zoomLabel)
            this.zoomLabel.textContent = zoom.toFixed(2) + "x";
    }

    private onWheel(e: WheelEvent) {
        e.preventDefault();
        this.setZoom(this.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), { x: e.clientX, y: e.clientY });
    }

    /** Drag anywhere on the image to pan, as long as it overflows the viewport. */
    private onPointerDown(e: PointerEvent) {
        if (e.button !== 0)
            return;

        const startX = e.clientX, startY = e.clientY;
        const startLeft = this.viewport.scrollLeft, startTop = this.viewport.scrollTop;

        const move = (ev: PointerEvent) => {
            this.viewport.scrollLeft = startLeft - (ev.clientX - startX);
            this.viewport.scrollTop = startTop - (ev.clientY - startY);
        };

        const up = () => {
            this.viewport.classList.remove("is-panning");
            this.viewport.removeEventListener("pointermove", move);
            this.viewport.removeEventListener("pointerup", up);
            this.viewport.removeEventListener("pointercancel", up);
        };

        e.preventDefault();
        this.viewport.setPointerCapture(e.pointerId);
        this.viewport.classList.add("is-panning");
        this.viewport.addEventListener("pointermove", move);
        this.viewport.addEventListener("pointerup", up);
        this.viewport.addEventListener("pointercancel", up);
    }
}
