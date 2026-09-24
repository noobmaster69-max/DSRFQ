/**
 * Styles for the processing queue page: the lane strip above the grid, the
 * status pills inside it, and the per-row actions.
 *
 * Colours derive from --bs-body-color / --bs-body-bg / --bs-border-color, the
 * only Bootstrap variables every installed theme redefines. Surfaces are mixed
 * from the body colour so they darken on light themes and lighten on dark ones
 * without a per-theme block -- --bs-tertiary-bg is not redefined by
 * theme-cosmos-dark and would paint a light card behind light text.
 */
export function CostingPartQueueCss(): string {
    return `<style id="dsrfq-costing-queue-css">
    .cq-lanes {
      --cq-ink:     var(--bs-body-color, #212529);
      --cq-surface: var(--bs-body-bg, #fff);
      --cq-line:    var(--bs-border-color, #d5dce0);
      --cq-muted:   color-mix(in srgb, var(--cq-ink) 62%, var(--cq-surface));
      --cq-card:    color-mix(in srgb, var(--cq-ink) 4%, var(--cq-surface));
      --cq-run:     var(--bs-warning, #d9a047);
      --cq-wait:    var(--bs-primary, #0d6efd);
      --cq-fail:    var(--bs-danger, #dc3545);
      --cq-ok:      var(--bs-success, #198754);
      color: var(--cq-ink);
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      padding: 10px 10px 0;
    }
    @media (max-width: 780px) { .cq-lanes { grid-template-columns: 1fr; } }

    .cq-lane {
      border: 1px solid var(--cq-line);
      border-radius: 8px;
      background: var(--cq-card);
      padding: 10px 12px;
      /* The left edge is the only thing that differs between an idle lane and a
         busy one at a glance, so it carries the state rather than the border. */
      border-left: 3px solid var(--cq-line);
    }
    .cq-lane.is-running { border-left-color: var(--cq-run); }
    .cq-lane.is-waiting { border-left-color: var(--cq-wait); }

    .cq-lane-head {
      display: flex; align-items: baseline; justify-content: space-between;
      font-size: 10px; font-weight: 700; letter-spacing: .09em;
      text-transform: uppercase; color: var(--cq-muted);
    }
    .cq-lane-limit { letter-spacing: 0; text-transform: none; }
    .cq-lane-now {
      margin-top: 4px;
      font-size: 13px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .cq-lane-idle { color: var(--cq-muted); font-style: italic; }
    .cq-lane-counts {
      margin-top: 6px; display: flex; gap: 12px;
      font-size: 11.5px; color: var(--cq-muted);
      font-variant-numeric: tabular-nums;
    }
    .cq-lane-counts b { color: var(--cq-ink); font-weight: 600; }
    .cq-lane-counts .is-fail b { color: var(--cq-fail); }

    /* Shown only when work has been waiting with nothing running -- almost
       always the consumer being down, which the queue alone cannot say. */
    .cq-alert {
      margin: 10px 10px 0;
      padding: 8px 12px;
      border: 1px solid var(--bs-danger, #dc3545);
      border-radius: 8px;
      color: var(--bs-danger, #dc3545);
      font-size: 12.5px;
    }
    .cq-alert:empty { display: none; }

    /* ── In the grid ──────────────────────────────────────────────────── */
    .cq-pill {
      display: inline-block;
      padding: 1px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: .02em;
      border: 1px solid currentColor;
    }
    .cq-pill.is-queued    { color: var(--bs-primary, #0d6efd); }
    .cq-pill.is-running   { color: var(--bs-warning, #d9a047); }
    .cq-pill.is-completed { color: var(--bs-success, #198754); }
    .cq-pill.is-failed    { color: var(--bs-danger, #dc3545); }
    .cq-pill.is-cancelled { color: var(--bs-secondary, #6c757d); }

    .cq-actions { display: flex; gap: 4px; }
    .cq-act {
      border: 1px solid var(--bs-border-color, #d5dce0);
      background: transparent;
      border-radius: 5px;
      padding: 1px 7px;
      font-size: 11px;
      line-height: 18px;
      color: inherit;
      cursor: pointer;
    }
    .cq-act:hover { border-color: currentColor; }
    .cq-act.cq-act-cancel:hover { color: var(--bs-danger, #dc3545); }

    /* Toolbar toggles. A tool button has no pressed state of its own, so the
       outline is what says Live and Show finished are currently on. */
    .s-Toolbar .tool-button.cq-on {
      outline: 1px solid var(--bs-primary, #0d6efd);
      outline-offset: -1px;
      border-radius: 4px;
    }
    </style>`;
}
