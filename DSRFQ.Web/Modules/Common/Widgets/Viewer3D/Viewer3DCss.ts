/**
 * Styles for Viewer3DWidget.
 *
 * Lifted verbatim from DS_ERP StrategyWidgetCss.ts (the `.st3-*` block) so the
 * two stay diffable. The class prefix is deliberately unchanged for that reason.
 * Only StrategyWidget's own `.st-viewer-3d` layout rule was dropped, since the
 * host element here is the workspace stage rather than a bootstrap tab pane.
 */
export function Viewer3DCss(): string {
    return `<style>
    .st3-root {
      --st3-bg: #eef2f6;
      --st3-fg: #475569;
      --st3-fg-strong: #0f172a;
      --st3-fg-dim: #94a3b8;
      --st3-panel: rgba(255, 255, 255, .88);
      --st3-line: rgba(100, 116, 139, .30);
      --st3-hover: rgba(100, 116, 139, .16);
      --st3-veil: rgba(238, 242, 246, .78);
      --st3-link: #0369a1;

      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: var(--st3-bg);
      color: var(--st3-fg);
    }
    .st3-root.is-dark {
      --st3-bg: #1e293b;
      --st3-fg: #cbd5e1;
      --st3-fg-strong: #ffffff;
      --st3-fg-dim: #64748b;
      --st3-panel: rgba(15, 23, 42, .78);
      --st3-line: rgba(148, 163, 184, .35);
      --st3-hover: rgba(148, 163, 184, .28);
      --st3-veil: rgba(15, 23, 42, .72);
      --st3-link: #7dd3fc;
    }

    .st3-canvas { position: absolute; inset: 0; }
    .st3-root .hidden { display: none !important; }

    .st3-empty,
    .st3-busy {
      position: absolute;
      inset: 0;
      z-index: 5;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 24px;
      text-align: center;
      color: var(--st3-fg);
      background: var(--st3-bg);
      pointer-events: none;
    }
    .st3-empty svg { opacity: .4; margin-bottom: 8px; }
    .st3-empty-title { margin: 0; font-size: 1.05rem; font-weight: 600; color: var(--st3-fg-strong); }
    .st3-empty-sub { margin: 0; max-width: 46ch; font-size: .8125rem; line-height: 1.5; }

    .st3-busy { background: var(--st3-veil); font-size: 12px; }
    .st3-spinner {
      width: 26px; height: 26px; margin-bottom: 10px;
      border: 2px solid var(--st3-line);
      border-top-color: var(--st3-fg-strong);
      border-radius: 50%;
      animation: st3-spin .8s linear infinite;
    }
    @keyframes st3-spin { to { transform: rotate(360deg); } }

    /* Preset views — top right */
    .st3-views {
      position: absolute;
      top: 10px; right: 10px;
      z-index: 10;
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 3px;
      max-width: 220px;
    }
    .st3-view-btn {
      padding: 4px 9px;
      border: 1px solid var(--st3-line);
      border-radius: 7px;
      background: var(--st3-panel);
      color: var(--st3-fg);
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      backdrop-filter: blur(4px);
    }
    .st3-view-btn:hover { background: var(--st3-hover); color: var(--st3-fg-strong); }

    /* Viewer controls — bottom right */
    .st3-hud {
      position: absolute;
      right: 10px; bottom: 10px;
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 4px;
      border: 1px solid var(--st3-line);
      border-radius: 10px;
      background: var(--st3-panel);
      backdrop-filter: blur(6px);
    }
    .st3-hud-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 28px; height: 28px;
      padding: 0;
      border: none; border-radius: 7px;
      background: transparent;
      color: var(--st3-fg);
      cursor: pointer;
    }
    .st3-hud-btn svg { width: 15px; height: 15px; }
    .st3-hud-btn:hover:not(:disabled) { background: var(--st3-hover); color: var(--st3-fg-strong); }
    .st3-hud-btn:disabled { opacity: .4; cursor: not-allowed; }
    .st3-hud-btn.active { background: var(--st-accent); color: #fff; }
    .st3-hud-sep { width: 1px; height: 18px; margin: 0 3px; background: var(--st3-line); }

    /* Info / parts dock — left */
    .st3-dock {
      position: absolute;
      top: 10px; left: 10px; bottom: 52px;
      z-index: 10;
      width: 250px;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--st3-line);
      border-radius: 10px;
      background: var(--st3-panel);
      backdrop-filter: blur(6px);
      overflow: hidden;
    }
    .st3-dock-tabs {
      display: flex;
      flex-shrink: 0;
      border-bottom: 1px solid var(--st3-line);
    }
    .st3-dock-tab {
      flex: 1;
      padding: 7px 8px;
      border: none;
      background: transparent;
      color: var(--st3-fg);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .04em;
      cursor: pointer;
    }
    .st3-dock-tab:hover { color: var(--st3-fg-strong); }
    .st3-dock-tab.active { color: var(--st3-fg-strong); box-shadow: inset 0 -2px 0 0 var(--st-accent); }
    .st3-dock-body { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 8px; }

    .st3-scope {
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--st3-line);
      font-size: 11px;
      font-weight: 600;
      color: var(--st3-fg-strong);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .st3-stat {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 10px;
      padding: 3px 0;
      font-size: 11.5px;
    }
    .st3-stat-k { color: var(--st3-fg); flex-shrink: 0; }
    .st3-stat-v { color: var(--st3-fg-strong); text-align: right; font-variant-numeric: tabular-nums; }
    .st3-na { color: var(--st3-fg-dim); font-style: italic; }
    .st3-note { margin: 8px 0 0; font-size: 10.5px; line-height: 1.5; color: var(--st3-fg-dim); }
    .st3-link {
      margin-top: 8px;
      padding: 0;
      border: none;
      background: none;
      color: var(--st3-link);
      font-size: 11px;
      cursor: pointer;
      text-decoration: underline;
    }

    .st3-tree { margin-top: 4px; }
    .st3-tree-row {
      display: flex;
      align-items: center;
      gap: 4px;
      padding-right: 4px;
      min-height: 22px;
      border-radius: 5px;
      font-size: 11.5px;
      color: var(--st3-fg);
    }
    .st3-tree-row.is-node { color: var(--st3-fg-dim); font-weight: 600; }
    .st3-tree-row.is-mesh { cursor: pointer; }
    .st3-tree-row.is-mesh:hover { background: var(--st3-hover); color: var(--st3-fg-strong); }
    .st3-tree-row.is-selected { background: var(--st-accent); color: #fff; }
    .st3-tree-row.is-hidden .st3-tree-label { opacity: .45; text-decoration: line-through; }
    .st3-tree-label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .st3-tree-btn {
      flex-shrink: 0;
      display: none;
      align-items: center; justify-content: center;
      width: 20px; height: 20px;
      padding: 0;
      border: none; border-radius: 4px;
      background: transparent;
      color: inherit;
      cursor: pointer;
    }
    .st3-tree-btn svg { width: 12px; height: 12px; }
    .st3-tree-row:hover .st3-tree-btn,
    .st3-tree-row.is-selected .st3-tree-btn,
    .st3-tree-row.is-hidden .st3-tree-btn { display: inline-flex; }
    .st3-tree-btn:hover { background: var(--st3-hover); }

    @media (max-width: 1024px) {
      .st3-dock { width: 200px; }
      .st3-views { max-width: 150px; }
    }

    </style>`;
}
