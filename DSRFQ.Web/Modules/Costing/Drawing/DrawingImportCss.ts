/**
 * Styles for the processing-mode chooser in the upload dialog.
 *
 * Colours derive from --bs-body-color / --bs-body-bg / --bs-border-color, the
 * only Bootstrap variables every installed theme redefines. Mixing a surface
 * from the body colour makes it darker on light themes and lighter on dark ones
 * without a per-theme block; --bs-tertiary-bg and --bs-secondary-bg are NOT
 * redefined by theme-cosmos-dark and would paint a light card behind light text.
 */
export function DrawingImportCss(): string {
    return `<style id="dsrfq-drawing-import-css">
    .di-modes {
      --di-ink:     var(--bs-body-color, #212529);
      --di-surface: var(--bs-body-bg, #fff);
      --di-line:    var(--bs-border-color, #d5dce0);
      --di-accent:  var(--bs-primary, #0d6efd);
      /* Mixed toward the surface, not toward transparent: an alpha colour
         reads differently depending on what is behind it, and these carry the
         warnings, so they need a predictable contrast. */
      --di-muted:   color-mix(in srgb, var(--di-ink) 68%, var(--di-surface));
      --di-warn:    color-mix(in srgb, var(--di-ink) 82%, var(--di-surface));
      --di-hover:   color-mix(in srgb, var(--di-ink) 5%, var(--di-surface));
      margin-top: 14px;
      color: var(--di-ink);
    }
    .di-modes-title {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .1em;
      text-transform: uppercase;
      color: var(--di-muted);
      margin-bottom: 8px;
    }
    .di-mode-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    @media (max-width: 620px) { .di-mode-grid { grid-template-columns: 1fr; } }

    /* The whole card is the control, so the hit area matches what it looks
       like; the radio itself stays for keyboard and screen-reader users. */
    .di-mode {
      position: relative;
      display: block;
      border: 1px solid var(--di-line);
      border-radius: 10px;
      padding: 12px 14px 12px 40px;
      background: var(--di-surface);
      cursor: pointer;
      transition: border-color .15s, background .15s, box-shadow .15s;
    }
    .di-mode:hover { background: var(--di-hover); border-color: var(--di-accent); }
    .di-mode input {
      position: absolute;
      top: 14px; left: 14px;
      margin: 0;
      accent-color: var(--di-accent);
    }
    .di-mode.is-selected {
      border-color: var(--di-accent);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--di-accent) 18%, transparent);
    }
    .di-mode-head {
      display: flex; align-items: baseline; gap: 8px;
      font-size: 13.5px; font-weight: 600; margin-bottom: 2px;
    }
    .di-mode-tag {
      font-size: 10px; font-weight: 600; letter-spacing: .04em;
      padding: 1px 7px; border-radius: 10px;
      border: 1px solid var(--di-line); color: var(--di-muted);
    }
    .di-mode.is-selected .di-mode-tag {
      border-color: var(--di-accent); color: var(--di-accent);
    }
    .di-mode-sub { font-size: 11.5px; color: var(--di-muted); margin-bottom: 8px; }

    .di-points { list-style: none; margin: 0; padding: 0; font-size: 11.5px; }
    .di-points li {
      display: flex; gap: 6px; align-items: flex-start;
      padding: 1px 0; line-height: 1.45;
    }
    .di-points .di-mark { flex: 0 0 auto; font-weight: 700; line-height: 1.35; }
    .di-pro  .di-mark { color: var(--bs-success, #198754); }
    .di-con  .di-mark { color: var(--bs-warning-text-emphasis, #997404); }
    /* The drawbacks are the point of showing this at all, so they stay clearly
       legible rather than being dimmed like secondary text. */
    .di-con  { color: var(--di-warn); }

    /* Which stages to run: ticked by default, so the boxes read as "on" until
       the operator turns one off. */
    .di-stages { margin-top: 14px; }
    .di-stage-list { display: flex; flex-direction: column; gap: 6px; }
    .di-stage {
      display: flex;
      align-items: flex-start;
      gap: 9px;
      padding: 8px 11px;
      border: 1px solid var(--bs-border-color, #dee2e6);
      border-radius: 7px;
      cursor: pointer;
      background: var(--bs-body-bg, #fff);
    }
    .di-stage.is-on {
      border-color: var(--bs-primary, #0d6efd);
      background: color-mix(in srgb, var(--bs-primary, #0d6efd) 6%, transparent);
    }
    .di-stage:not(.is-on) { opacity: .68; }
    .di-stage input { margin-top: 2px; flex: 0 0 auto; }
    .di-stage-text { display: flex; flex-direction: column; gap: 1px; }
    .di-stage-text b { font-size: 12.5px; }
    .di-stage-text small { font-size: 11px; color: var(--di-ink); opacity: .85; }
    /* Is the service behind this stage running - icon + words, never colour alone. */
    .di-stage-health { margin-left: auto; display: inline-flex; align-items: center; gap: 5px;
                       font-size: 11.5px; font-weight: 600; max-width: 55%; text-align: right; }
    .di-health-icon { display: inline-grid; place-items: center; width: 15px; height: 15px; border-radius: 50%;
                      font-size: 9px; color: #fff; background: #898781; flex: 0 0 auto; }
    .di-stage-health[data-state="ready"] .di-health-icon { background: #0ca30c; }
    .di-stage-health[data-state="degraded"] .di-health-icon { background: #fab219; color: #0b0b0b; }
    .di-stage-health[data-state="blocked"] .di-health-icon { background: #d03b3b; }
    .di-stage-health[data-state="blocked"] { color: #d03b3b; }
    .di-stage-note a { margin-left: 6px; font-weight: 600; }
    .di-stage-note { border-left-color: var(--bs-primary, #0d6efd);
                     background: color-mix(in srgb, var(--bs-primary, #0d6efd) 8%, transparent); }

    /* Why one option is recommended, rather than just marking it. */
    .di-note {
      margin-top: 10px;
      padding: 8px 11px;
      border-left: 3px solid var(--bs-warning, #ffc107);
      background: color-mix(in srgb, var(--bs-warning, #ffc107) 10%, transparent);
      border-radius: 0 6px 6px 0;
      font-size: 11.5px;
      color: var(--di-ink);
    }
    </style>`;
}
