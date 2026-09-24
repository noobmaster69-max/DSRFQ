import { fetchServiceHealth, HealthResponse, HealthSample, HealthService, HealthStage, STAGE_LABELS, STATE_TEXT } from './ServiceHealthClient';
import { ServiceHealthCss } from './ServiceHealthCss';

/**
 * Service Status - can each pipeline stage run right now, and how have the
 * services behind it behaved over the last hour.
 *
 * Form, per data job:
 *   stage readiness   -> stat tiles (a state, not a quantity)
 *   service state now -> status pill, icon + word
 *   up/down over time -> uptime strip, one bar per minute, status colours
 *   response time     -> single-series sparkline with a crosshair tooltip
 * One chart per service (small multiples), so no chart ever needs a legend or
 * a second colour. Status colours are the fixed good / warning / critical
 * steps and always sit next to their word; a table view carries every value.
 */

const REFRESH_MS = 5000;
const BUCKETS = 60;            // minutes shown in the uptime strip

export default function pageInit() {
    if (!document.getElementById('dsrfq-service-health-css'))
        document.head.insertAdjacentHTML('beforeend', ServiceHealthCss());

    const host = (document.getElementById('PanelDiv')
        ?? document.querySelector('.content-body')
        ?? document.body) as HTMLElement;

    const root = document.createElement('div');
    root.className = 'sh-root';
    root.innerHTML = `
        <div class="sh-head">
            <div>
                <h2 class="sh-title">Service Status</h2>
                <p class="sh-sub">Whether Drawing, Costing and Ballooning can run right now.
                   Checked by the server every 10 seconds; this page refreshes itself.</p>
            </div>
            <div class="sh-updated" aria-live="polite"></div>
        </div>
        <section class="sh-stages" aria-label="Stages"></section>
        <h3 class="sh-h3">Services <span class="sh-h3-note">last hour</span></h3>
        <section class="sh-cards" aria-label="Services"></section>
        <details class="sh-table-wrap">
            <summary>Table view</summary>
            <table class="sh-table">
                <thead><tr><th>Service</th><th>Status</th><th>Response</th><th>Up, last hour</th><th>Needed by</th><th>Detail</th></tr></thead>
                <tbody></tbody>
            </table>
        </details>
        <div class="sh-tooltip" role="tooltip" hidden></div>`;
    host.appendChild(root);

    const tooltip = root.querySelector('.sh-tooltip') as HTMLElement;
    let timer: any;

    const refresh = async () => {
        try {
            const data = await fetchServiceHealth(false);
            render(root, data, tooltip);
            (root.querySelector('.sh-updated') as HTMLElement).textContent =
                `Updated ${new Date().toLocaleTimeString()}`;
            root.classList.remove('sh-stale');
        } catch {
            root.classList.add('sh-stale');
            (root.querySelector('.sh-updated') as HTMLElement).textContent =
                'Cannot reach the DSRFQ server - showing the last reading';
        }
    };

    refresh();
    timer = setInterval(() => { if (!document.hidden) refresh(); }, REFRESH_MS);
    window.addEventListener('beforeunload', () => clearInterval(timer));
}

function render(root: HTMLElement, data: HealthResponse, tooltip: HTMLElement) {
    renderStages(root.querySelector('.sh-stages') as HTMLElement, data.Stages);
    renderCards(root.querySelector('.sh-cards') as HTMLElement, data, tooltip);
    renderTable(root.querySelector('.sh-table tbody') as HTMLElement, data.Services);
}

function el(tag: string, cls?: string, text?: string): HTMLElement {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
}

function pill(state: string): HTMLElement {
    const s = STATE_TEXT[state as keyof typeof STATE_TEXT] ?? STATE_TEXT.unknown;
    const p = el('span', `sh-pill sh-${state}`);
    p.append(el('span', 'sh-pill-icon', s.icon), el('span', 'sh-pill-label', s.label));
    return p;
}

function renderStages(host: HTMLElement, stages: HealthStage[]) {
    host.replaceChildren(...stages.map(st => {
        const tile = el('div', `sh-stage sh-stage-${st.State}`);
        tile.append(el('div', 'sh-stage-label', STAGE_LABELS[st.Stage]));
        tile.append(pill(st.State));
        const why = el('div', 'sh-stage-why');
        if (st.Blocking.length)
            why.textContent = `Waiting for: ${st.Blocking.join(', ')}. New jobs queue and start when it is back.`;
        else if (st.Degrading.length)
            why.textContent = `Runs without: ${st.Degrading.join(', ')}.`;
        else if (st.State === 'ready')
            why.textContent = 'Everything it needs is running.';
        else
            why.textContent = 'Checking…';
        tile.append(why);
        return tile;
    }));
}

function ago(iso?: string): string {
    if (!iso) return 'never';
    const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
    if (s < 60) return `${s} s ago`;
    if (s < 3600) return `${Math.round(s / 60)} min ago`;
    return `${Math.round(s / 3600)} h ago`;
}

function renderCards(host: HTMLElement, data: HealthResponse, tooltip: HTMLElement) {
    host.replaceChildren(...data.Services.map(svc => {
        const card = el('article', `sh-card sh-card-${svc.State}`);
        const top = el('div', 'sh-card-top');
        const names = el('div');
        names.append(el('div', 'sh-card-name', svc.Name), el('div', 'sh-card-purpose', svc.Purpose));
        top.append(names, pill(svc.State));
        card.append(top);

        const figures = el('div', 'sh-figures');
        const fig = (label: string, value: string) => {
            const f = el('div', 'sh-fig');
            f.append(el('div', 'sh-fig-value', value), el('div', 'sh-fig-label', label));
            return f;
        };
        figures.append(
            fig('response', svc.LatencyMs != null ? `${svc.LatencyMs.toLocaleString()} ms` : '—'),
            fig('up, last hour', svc.UptimePercent != null ? `${svc.UptimePercent}%` : '—'),
            fig('last seen up', svc.State === 'down' ? ago(svc.LastUpAt) : 'now'));
        card.append(figures);

        if (svc.State === 'down' && svc.Detail)
            card.append(el('div', 'sh-detail', svc.Detail));

        const needed = [...svc.RequiredBy.map(s => STAGE_LABELS[s]),
                        ...svc.ImprovesStages.map(s => `${STAGE_LABELS[s]} (optional)`)];
        if (needed.length)
            card.append(el('div', 'sh-needed', `Needed by ${needed.join(', ')}`));

        const history = svc.History ?? [];
        card.append(el('div', 'sh-chart-label', 'Up / down, per minute'));
        card.append(uptimeStrip(history, tooltip, data.IntervalSeconds));
        card.append(el('div', 'sh-chart-label', 'Response time (ms)'));
        card.append(latencySpark(history, tooltip));
        return card;
    }));
}

/** One bar per minute; a minute takes its worst sample. */
function uptimeStrip(history: HealthSample[], tooltip: HTMLElement, intervalSeconds: number): HTMLElement {
    const W = 300, H = 22, GAP = 2;
    const now = Date.now();
    const buckets: { worst: string; up: number; total: number; start: number }[] = [];
    for (let i = BUCKETS - 1; i >= 0; i--)
        buckets.push({ worst: 'none', up: 0, total: 0, start: now - (i + 1) * 60000 });
    const rank: Record<string, number> = { none: 0, up: 1, slow: 2, down: 3 };
    for (const h of history) {
        const idx = BUCKETS - 1 - Math.floor((now - Date.parse(h.At)) / 60000);
        if (idx < 0 || idx >= BUCKETS) continue;
        const b = buckets[idx];
        b.total++;
        if (h.State !== 'down') b.up++;
        if (rank[h.State] > rank[b.worst]) b.worst = h.State;
    }

    const bw = (W - GAP * (BUCKETS - 1)) / BUCKETS;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'sh-strip', role: 'img',
        'aria-label': 'Up or down in each of the last 60 minutes' });
    buckets.forEach((b, i) => {
        const r = svgEl('rect', {
            x: (i * (bw + GAP)).toFixed(2), y: 0, width: bw.toFixed(2), height: H, rx: 1.5,
            class: `sh-bar sh-bar-${b.worst}`,
        });
        const show = (ev: PointerEvent | FocusEvent) => {
            const t = new Date(b.start);
            const label = b.total === 0 ? 'no reading'
                : b.worst === 'down' ? `down in ${b.total - b.up} of ${b.total} checks`
                : b.worst === 'slow' ? `up, slow at times (${b.total} checks)`
                : `up (${b.total} checks)`;
            showTip(tooltip, ev, label, t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        };
        r.addEventListener('pointermove', show as any);
        r.addEventListener('pointerleave', () => hideTip(tooltip));
        svg.appendChild(r);
    });
    const wrap = el('div', 'sh-strip-wrap');
    wrap.append(svg);
    const axis = el('div', 'sh-axis');
    axis.append(el('span', '', '60 min ago'), el('span', '', 'now'));
    wrap.append(axis);
    return wrap;
}

/** Response time over the hour; gaps where the service was down. */
function latencySpark(history: HealthSample[], tooltip: HTMLElement): HTMLElement {
    const W = 300, H = 56, PAD_T = 6, PAD_B = 4;
    const now = Date.now(), span = 3600000;
    const pts = history.map(h => ({ t: Date.parse(h.At), ms: h.Ms, state: h.State }))
        .filter(p => now - p.t <= span);
    const max = Math.max(50, ...pts.map(p => p.ms ?? 0));
    const x = (t: number) => W - ((now - t) / span) * W;
    const y = (ms: number) => PAD_T + (H - PAD_T - PAD_B) * (1 - ms / max);

    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'sh-spark', role: 'img',
        'aria-label': `Response time over the last hour, highest ${max} ms` });
    svg.appendChild(svgEl('line', { x1: 0, x2: W, y1: H - PAD_B, y2: H - PAD_B, class: 'sh-baseline' }));

    // One path per unbroken run of readings - a down check breaks the line.
    let d = '', open = false;
    for (const p of pts) {
        if (p.ms == null) { open = false; continue; }
        d += `${open ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.ms).toFixed(1)} `;
        open = true;
    }
    if (d) svg.appendChild(svgEl('path', { d, class: 'sh-line' }));

    const cross = svgEl('line', { x1: 0, x2: 0, y1: 0, y2: H, class: 'sh-cross', visibility: 'hidden' });
    const dot = svgEl('circle', { r: 4, class: 'sh-dot', visibility: 'hidden' });
    svg.append(cross, dot);

    const hit = svgEl('rect', { x: 0, y: 0, width: W, height: H, class: 'sh-hit' });
    hit.addEventListener('pointermove', (ev: PointerEvent) => {
        if (!pts.length) return;
        const box = svg.getBoundingClientRect();
        const t = now - (1 - (ev.clientX - box.left) / box.width) * span;
        const p = pts.reduce((a, b) => Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a);
        const px = x(p.t);
        cross.setAttribute('x1', String(px)); cross.setAttribute('x2', String(px));
        cross.setAttribute('visibility', 'visible');
        if (p.ms != null) {
            dot.setAttribute('cx', String(px)); dot.setAttribute('cy', String(y(p.ms)));
            dot.setAttribute('visibility', 'visible');
        } else dot.setAttribute('visibility', 'hidden');
        showTip(tooltip, ev, p.ms != null ? `${p.ms.toLocaleString()} ms` : 'not running',
            new Date(p.t).toLocaleTimeString());
    });
    hit.addEventListener('pointerleave', () => {
        cross.setAttribute('visibility', 'hidden');
        dot.setAttribute('visibility', 'hidden');
        hideTip(tooltip);
    });
    svg.appendChild(hit);

    const wrap = el('div', 'sh-spark-wrap');
    wrap.append(svg);
    const axis = el('div', 'sh-axis');
    axis.append(el('span', '', `max ${max.toLocaleString()} ms`), el('span', '', 'now'));
    wrap.append(axis);
    return wrap;
}

function renderTable(tbody: HTMLElement, services: HealthService[]) {
    tbody.replaceChildren(...services.map(s => {
        const tr = el('tr');
        const td = (v: string | HTMLElement) => { const c = el('td'); c.append(v); return c; };
        tr.append(
            td(s.Name),
            td(pill(s.State)),
            td(s.LatencyMs != null ? `${s.LatencyMs} ms` : '—'),
            td(s.UptimePercent != null ? `${s.UptimePercent}%` : '—'),
            td([...s.RequiredBy.map(x => STAGE_LABELS[x]), ...s.ImprovesStages.map(x => `${STAGE_LABELS[x]} (optional)`)].join(', ') || '—'),
            td(s.Detail ?? ''));
        return tr;
    }));
}

function svgEl(tag: string, attrs: Record<string, any>): SVGElement {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    return e;
}

/** Values lead, labels follow; text only, never innerHTML. */
function showTip(tip: HTMLElement, ev: PointerEvent | FocusEvent, value: string, label: string) {
    tip.replaceChildren(el('strong', '', value), el('span', '', label));
    tip.hidden = false;
    const x = (ev as PointerEvent).clientX ?? 0, y = (ev as PointerEvent).clientY ?? 0;
    tip.style.left = `${Math.min(window.innerWidth - 200, x + 12)}px`;
    tip.style.top = `${y + 14}px`;
}

function hideTip(tip: HTMLElement) { tip.hidden = true; }
