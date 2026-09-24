/**
 * Styles for the file library.
 *
 * Colours derive from --bs-body-color / --bs-body-bg / --bs-border-color, the
 * only Bootstrap variables every installed theme redefines. Surfaces are mixed
 * from the body colour so they darken on light themes and lighten on dark ones
 * without a per-theme block.
 */
export function CostingPartFilesCss(): string {
    return `<style id="dsrfq-file-library-css">
    .s-CostingPartFilesGrid {
      --fl-ink:     var(--bs-body-color, #212529);
      --fl-surface: var(--bs-body-bg, #fff);
      --fl-line:    var(--bs-border-color, #d5dce0);
      --fl-muted:   color-mix(in srgb, var(--fl-ink) 62%, var(--fl-surface));
      --fl-accent:  var(--bs-primary, #0d6efd);
    }

    /* A drawing is recognised by its picture faster than by its name. */
    .fl-thumb {
      width: 38px; height: 38px; object-fit: contain;
      border: 1px solid var(--fl-line); border-radius: 4px;
      background: var(--fl-surface);
    }
    .fl-thumb.is-empty {
      display: inline-block;
      background: repeating-linear-gradient(45deg,
        transparent, transparent 4px,
        color-mix(in srgb, var(--fl-ink) 7%, transparent) 4px,
        color-mix(in srgb, var(--fl-ink) 7%, transparent) 8px);
    }

    .fl-type {
      display: inline-block; min-width: 30px; padding: 1px 6px;
      border-radius: 4px; color: #fff; font-size: 10px; font-weight: 700;
      text-align: center; letter-spacing: .03em;
    }

    .fl-file { color: var(--fl-accent); text-decoration: none; }
    .fl-file:hover { text-decoration: underline; }

    /* Counts: present when they matter, absent when zero. */
    .fl-count {
      display: inline-block; min-width: 20px; padding: 0 5px;
      border-radius: 8px; font-size: 11px; font-variant-numeric: tabular-nums;
      background: color-mix(in srgb, var(--fl-ink) 8%, var(--fl-surface));
      color: var(--fl-ink);
    }
    /* The same drawing gets uploaded repeatedly; this is a warning, not a stat. */
    .fl-dup {
      display: inline-block; min-width: 20px; padding: 0 5px; border-radius: 8px;
      font-size: 11px; font-weight: 600;
      color: var(--bs-warning-text-emphasis, #997404);
      border: 1px solid currentColor;
    }

    .fl-act {
      display: inline-block; border: 1px solid var(--fl-line); background: transparent;
      border-radius: 4px; padding: 0 6px; margin-right: 3px;
      font-size: 10.5px; line-height: 18px; color: inherit;
      cursor: pointer; text-decoration: none;
    }
    .fl-act:hover { border-color: var(--fl-accent); color: var(--fl-accent); }

    /* ── Detail panel ──────────────────────────────────────────────────── */
    .fl-detail-host:empty { display: none; }
    .fl-detail-panel {
      border: 1px solid var(--fl-line); border-top: 3px solid var(--fl-accent);
      border-radius: 8px; margin: 10px; padding: 10px 14px;
      background: color-mix(in srgb, var(--fl-ink) 3%, var(--fl-surface));
      max-height: 340px; overflow-y: auto;
    }
    .fl-detail-head {
      display: flex; align-items: baseline; gap: 10px;
      padding-bottom: 6px; border-bottom: 1px solid var(--fl-line);
      margin-bottom: 8px;
    }
    .fl-detail-head span { font-size: 11.5px; color: var(--fl-muted); }
    .fl-detail-close { margin-left: auto; }

    .fl-sec { margin-bottom: 12px; }
    .fl-sec h4 {
      margin: 0 0 5px; font-size: 9.5px; font-weight: 700;
      letter-spacing: .09em; text-transform: uppercase; color: var(--fl-muted);
    }
    .fl-tbl { width: 100%; border-collapse: collapse; font-size: 11.5px; }
    .fl-tbl th {
      text-align: left; font-weight: 600; color: var(--fl-muted);
      border-bottom: 1px solid var(--fl-line); padding: 3px 6px;
    }
    .fl-tbl td { padding: 3px 6px; border-bottom: 1px solid var(--fl-line); }
    .fl-tbl .num { text-align: right; font-variant-numeric: tabular-nums; }
    .fl-list { margin: 0; padding-left: 18px; font-size: 11.5px; }
    .fl-duplink { margin-right: 8px; font-size: 11.5px; }
    .fl-none { font-size: 11.5px; color: var(--fl-muted); font-style: italic; margin: 0; }
    </style>`;
}
