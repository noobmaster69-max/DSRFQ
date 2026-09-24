/**
 * Service Status styles. Chart colours come from the data-viz reference palette:
 * status good / warning / critical (fixed, always paired with an icon + word),
 * one series colour (blue, slot 1) for the response-time line, recessive
 * hairline chrome. Dark mode uses its own validated steps, not a flip.
 */
export function ServiceHealthCss(): string {
    return `<style id="dsrfq-service-health-css">
    .sh-root {
      --sh-surface: #fcfcfb; --sh-ink: #0b0b0b; --sh-ink-2: #52514e; --sh-muted: #898781;
      --sh-grid: #e1e0d9; --sh-base: #c3c2b7; --sh-series: #2a78d6;
      --sh-good: #0ca30c; --sh-warn: #fab219; --sh-crit: #d03b3b; --sh-none: #e1e0d9;
      padding: 18px 22px 40px; color: var(--sh-ink); max-width: 1400px;
    }
    [data-bs-theme="dark"] .sh-root {
      --sh-surface: #1a1a19; --sh-ink: #ffffff; --sh-ink-2: #c3c2b7; --sh-muted: #898781;
      --sh-grid: #2c2c2a; --sh-base: #383835; --sh-series: #3987e5; --sh-none: #2c2c2a;
    }
    .sh-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 14px; }
    .sh-title { margin: 0; font-size: 22px; font-weight: 600; }
    .sh-sub { margin: 4px 0 0; color: var(--sh-ink-2); font-size: 13px; }
    .sh-updated { font-size: 12px; color: var(--sh-muted); white-space: nowrap; }
    .sh-stale .sh-updated { color: var(--sh-crit); font-weight: 600; }
    .sh-h3 { font-size: 15px; font-weight: 600; margin: 22px 0 10px; }
    .sh-h3-note { font-weight: 400; color: var(--sh-muted); font-size: 12px; margin-left: 6px; }

    .sh-stages { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
    .sh-stage { background: var(--sh-surface); border: 1px solid var(--sh-grid); border-radius: 10px; padding: 14px 16px; }
    .sh-stage-label { font-size: 13px; color: var(--sh-ink-2); margin-bottom: 6px; }
    .sh-stage .sh-pill { font-size: 17px; }
    .sh-stage-why { margin-top: 8px; font-size: 12.5px; color: var(--sh-ink-2); line-height: 1.4; }
    .sh-stage-blocked { border-left: 4px solid var(--sh-crit); }
    .sh-stage-degraded { border-left: 4px solid var(--sh-warn); }
    .sh-stage-ready { border-left: 4px solid var(--sh-good); }

    .sh-pill { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; font-size: 13px; color: var(--sh-ink); }
    .sh-pill-icon { display: inline-grid; place-items: center; width: 1.2em; height: 1.2em; border-radius: 50%;
                    font-size: .78em; color: #fff; background: var(--sh-muted); line-height: 1; }
    .sh-up .sh-pill-icon, .sh-ready .sh-pill-icon { background: var(--sh-good); }
    .sh-slow .sh-pill-icon, .sh-degraded .sh-pill-icon { background: var(--sh-warn); color: #0b0b0b; }
    .sh-down .sh-pill-icon, .sh-blocked .sh-pill-icon { background: var(--sh-crit); }

    .sh-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 12px; }
    .sh-card { background: var(--sh-surface); border: 1px solid var(--sh-grid); border-radius: 10px; padding: 14px 16px; }
    .sh-card-down { border-color: color-mix(in srgb, var(--sh-crit) 55%, var(--sh-grid)); }
    .sh-card-top { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
    .sh-card-name { font-weight: 600; font-size: 14px; }
    .sh-card-purpose { font-size: 12px; color: var(--sh-ink-2); margin-top: 2px; }
    .sh-figures { display: flex; gap: 22px; margin: 12px 0 6px; }
    .sh-fig-value { font-size: 17px; font-weight: 600; font-variant-numeric: proportional-nums; }
    .sh-fig-label { font-size: 11.5px; color: var(--sh-muted); }
    .sh-detail { font-size: 12px; color: var(--sh-ink-2); background: color-mix(in srgb, var(--sh-crit) 8%, transparent);
                 border-radius: 6px; padding: 5px 8px; margin: 6px 0; overflow-wrap: anywhere; }
    .sh-needed { font-size: 11.5px; color: var(--sh-muted); margin-bottom: 8px; }
    .sh-chart-label { font-size: 11px; color: var(--sh-muted); margin: 8px 0 3px; }

    .sh-strip, .sh-spark { width: 100%; display: block; overflow: visible; }
    .sh-strip { height: 22px; }
    .sh-spark { height: 56px; }
    .sh-bar-none { fill: var(--sh-none); }
    .sh-bar-up { fill: var(--sh-good); }
    .sh-bar-slow { fill: var(--sh-warn); }
    .sh-bar-down { fill: var(--sh-crit); }
    .sh-bar:hover { opacity: .8; }
    .sh-baseline { stroke: var(--sh-base); stroke-width: 1; }
    .sh-line { fill: none; stroke: var(--sh-series); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
    .sh-cross { stroke: var(--sh-muted); stroke-width: 1; }
    .sh-dot { fill: var(--sh-series); stroke: var(--sh-surface); stroke-width: 2; }
    .sh-hit { fill: transparent; cursor: crosshair; }
    .sh-axis { display: flex; justify-content: space-between; font-size: 10.5px; color: var(--sh-muted); margin-top: 2px; }

    .sh-tooltip { position: fixed; z-index: 3000; pointer-events: none; background: var(--sh-surface); color: var(--sh-ink);
                  border: 1px solid var(--sh-grid); border-radius: 6px; padding: 5px 9px; font-size: 12px;
                  box-shadow: 0 4px 14px rgba(0,0,0,.12); display: flex; flex-direction: column; gap: 1px; }
    .sh-tooltip span { color: var(--sh-ink-2); font-size: 11px; }

    .sh-table-wrap { margin-top: 18px; font-size: 13px; }
    .sh-table-wrap summary { cursor: pointer; color: var(--sh-ink-2); }
    .sh-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    .sh-table th, .sh-table td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--sh-grid); vertical-align: top; }
    .sh-table th { color: var(--sh-ink-2); font-weight: 600; font-size: 12px; }
    </style>`;
}
