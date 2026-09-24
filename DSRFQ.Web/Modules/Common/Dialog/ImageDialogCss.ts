/**
 * Styles for ImageDialog.
 *
 * Colours derive from --bs-body-bg / --bs-body-color / --bs-border-color, the
 * only Bootstrap variables every installed theme redefines, so the toolbar
 * stays readable on both light and dark themes without a per-theme block.
 *
 * `s-ImageDialog` comes from Widget.getCssClass and lands on the modal (or
 * ui-dialog) root via BaseDialog's dialogClass, not on the widget element.
 */
export function ImageDialogCss(): string {
    return `<style id="dsrfq-image-dialog-css">
    /* The viewer owns the whole body: no padding, and a bounded height so the
       image scrolls inside the modal instead of stretching it. display:block
       undoes BaseDialog's flex-layout so the height:100% chain below works. */
    .s-ImageDialog .modal-body { padding: 0; overflow: hidden; display: block; height: min(74vh, 900px); }
    .s-ImageDialog .modal-body > div { height: 100%; }

    /* jQuery UI fallback, used when Bootstrap modals are not available. */
    .s-ImageDialog.ui-dialog .ui-dialog-content { padding: 0; overflow: hidden; }
    .s-ImageDialog.ui-dialog .ui-dialog-content > div { height: 100%; }

    .img-dlg { position: relative; width: 100%; height: 100%; }

    /* Scrolling happens here; the image is sized in pixels rather than scaled
       with a transform so the scrollbars match the zoomed extent. */
    .img-dlg-viewport {
      width: 100%;
      height: 100%;
      overflow: auto;
      display: flex;
      cursor: grab;
      /* Checkerboard, so transparent PNGs are distinguishable from the page. */
      background-color: var(--bs-body-bg, #fff);
      background-image:
        linear-gradient(45deg, var(--bs-border-color, #dee2e6) 25%, transparent 25%),
        linear-gradient(-45deg, var(--bs-border-color, #dee2e6) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, var(--bs-border-color, #dee2e6) 75%),
        linear-gradient(-45deg, transparent 75%, var(--bs-border-color, #dee2e6) 75%);
      background-size: 20px 20px;
      background-position: 0 0, 0 10px, 10px -10px, -10px 0;
    }
    .img-dlg-viewport.is-panning { cursor: grabbing; }

    /* margin:auto centers the image while it is smaller than the viewport and
       collapses to zero once it overflows, which is what keeps panning sane. */
    .img-dlg-img {
      margin: auto;
      flex: 0 0 auto;
      user-select: none;
      -webkit-user-drag: none;
      image-rendering: auto;
    }
    /* Past a few hundred percent the browser's smoothing turns drawing
       hairlines into grey mush, so hand the pixels over untouched. */
    .img-dlg-img.is-magnified { image-rendering: pixelated; }

    .img-dlg-tools {
      position: absolute;
      top: .5rem;
      right: .75rem;
      z-index: 5;
      display: flex;
      flex-direction: column;
      gap: .25rem;
      align-items: stretch;
    }

    .img-dlg-btn {
      min-width: 2rem;
      padding: .2rem .35rem;
      line-height: 1.2;
      font-size: .85rem;
      color: var(--bs-body-color, #212529);
      background: color-mix(in srgb, var(--bs-body-bg, #fff) 80%, transparent);
      border: 1px solid var(--bs-border-color, #dee2e6);
      border-radius: .25rem;
      backdrop-filter: blur(2px);
    }
    .img-dlg-btn:hover { background: var(--bs-body-bg, #fff); }

    /* The reset button doubles as the zoom readout, so it needs room for
       "100.00x" without the column jumping width as the number changes. */
    .img-dlg-zoom { min-width: 4.25rem; font-variant-numeric: tabular-nums; }
    </style>`;
}
