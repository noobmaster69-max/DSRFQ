/** Styles for Viewer2DWidget. Scoped entirely under `.v2-`. */
export function Viewer2DCss(): string {
    return `<style>
    .v2-root {
      /* Same reasoning as the workspace: --bs-body-color, --bs-body-bg and
         --bs-border-color are the only variables every installed theme
         redefines, so the muted tone and the stage ground are mixed from them
         rather than taken from --bs-secondary-* (which theme-cosmos-dark leaves
         at Bootstrap's light greys). */
      --v2-surface: var(--bs-body-bg, #ffffff);
      --v2-line:    var(--bs-border-color, #d5dce0);
      --v2-ink:     var(--bs-body-color, #212529);
      --v2-muted:   color-mix(in srgb, var(--v2-ink) 65%, transparent);
      --v2-accent:  var(--bs-link-color, #0f41c9);
      position: relative;
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: color-mix(in srgb, var(--v2-ink) 10%, var(--v2-surface));
    }

    .v2-stage {
      position: relative;
      flex: 1 1 auto;
      min-height: 0;
      overflow: hidden;
      cursor: grab;
    }
    .v2-stage:active { cursor: grabbing; }

    /* panzoom writes its transform onto this element; the overlay rides along. */
    .v2-surface {
      position: absolute;
      top: 0;
      left: 0;
      transform-origin: 0 0;
    }
    .v2-image {
      display: block;
      max-width: none;
      user-select: none;
      -webkit-user-drag: none;
      background: #ffffff;
    }
    /* Sits exactly over the page bitmap in the same transformed space, so
       annotation coordinates need no conversion beyond percent-of-page. */
    .v2-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .v2-empty {
      position: absolute;
      inset: 0;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      text-align: center;
      color: var(--v2-muted);
    }
    .v2-empty-title { margin: 0; font-size: 1.05rem; font-weight: 600; }
    .v2-empty-sub { margin: 0; font-size: .8125rem; }

    .v2-thumbs {
      flex: 0 0 auto;
      display: flex;
      gap: 8px;
      padding: 8px;
      overflow-x: auto;
      border-top: 1px solid var(--v2-line);
      background: var(--v2-surface);
    }
    .v2-thumb {
      position: relative;
      flex: 0 0 auto;
      width: 92px;
      height: 68px;
      padding: 0;
      border: 2px solid transparent;
      border-radius: 6px;
      background: #ffffff;
      cursor: pointer;
      overflow: hidden;
    }
    .v2-thumb img { width: 100%; height: 100%; object-fit: contain; }
    .v2-thumb span {
      position: absolute;
      right: 3px;
      bottom: 3px;
      padding: 0 5px;
      border-radius: 3px;
      font-size: 11px;
      line-height: 16px;
      color: #ffffff;
      background: rgba(15, 23, 42, .72);
    }
    .v2-thumb.is-active { border-color: var(--v2-accent); }
    .v2-thumb:focus-visible { outline: 2px solid var(--v2-accent); outline-offset: 1px; }
    </style>`;
}
