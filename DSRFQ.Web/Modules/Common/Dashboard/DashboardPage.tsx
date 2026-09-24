/**
 * The pipeline dashboard.
 *
 * Every card answers one question about the costing pipeline, and the charts
 * are hand-built SVG rather than chart.js: the datasets are tiny (ten stages,
 * four lanes) and the mark specs here -- 24px bar cap, 4px rounded data end
 * square at the baseline, 2px surface gaps between stacked segments -- are
 * fiddlier to force through a chart library's option bag than to draw.
 *
 * Colour never carries meaning by itself. Every stacked segment wide enough to
 * hold its number is labelled, every chart has a legend, and each one can be
 * flipped to a table.
 */

// From the barrel rather than the per-class files: sergen emits one file per
// [ScriptInclude] class, so the five chart types would each need their own
// import path and would move if a class were renamed.
import { DashboardPageModel, StageDuration, PipelineStepStatus, LaneOutcome, CostCategory, PipelineFailure } from "../../ServerTypes/Common";
import { DashboardPageCss } from "./DashboardPageCss";

export default function pageInit({ model }: { model: DashboardPageModel }) {
    const host = document.getElementById("DashboardContent");
    if (!host)
        return;

    host.insertAdjacentHTML("beforebegin", DashboardPageCss());
    host.classList.add("dsrfq-dash");
    host.append(
        <>
            <KpiRow model={model} />

            <div class="dash-grid">
                <StageDurationCard stages={model.StageDurations ?? []} />
                <PipelineStepCard steps={model.PipelineSteps ?? []} parts={model.PartCount ?? 0} />
                <LaneOutcomeCard lanes={model.LaneOutcomes ?? []} />
                <CostCard costs={model.CostBreakdown ?? []} />
                <FailureCard failures={model.RecentFailures ?? []} />
            </div>
        </>);

    mountTooltip(host);
}

// ---------------------------------------------------------------- formatting

const nf = new Intl.NumberFormat("en-US");

/** 8 -> "8.2s", 78 -> "1m 18s". Seconds are the unit people quote stages in. */
function secs(v: number): string {
    if (v == null || isNaN(v))
        return "-";
    if (v < 60)
        return (v < 10 ? v.toFixed(1) : Math.round(v).toString()) + "s";
    const m = Math.floor(v / 60);
    const s = Math.round(v - m * 60);
    return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

function money(v: number): string {
    if (!v)
        return "$0";
    return v >= 1000
        ? "$" + nf.format(Math.round(v))
        : "$" + v.toFixed(2);
}

function pct(part: number, whole: number): number {
    return whole > 0 ? (100 * part) / whole : 0;
}

const ACRONYMS: Record<string, string> = { bom: "BOM", ocr: "OCR" };

/** Title case for a hyphenated stage or lane key: "title-block-recognise". */
function pretty(stage: string): string {
    return (stage ?? "").split(/[-_]/g)
        .map(w => ACRONYMS[w.toLowerCase()] ?? (w ? w[0].toUpperCase() + w.slice(1) : w))
        .join(" ");
}

// ------------------------------------------------------------------- KPI row

function KpiRow({ model }: { model: DashboardPageModel }) {
    const rate = model.StageSuccessRate ?? 0;
    const failed = model.FailedJobs ?? 0;

    return <div class="kpis">
        <Kpi label="Parts in the system" value={nf.format(model.PartCount ?? 0)}
            note={`${nf.format(model.StageRuns ?? 0)} stage runs recorded`} />

        <Kpi label="Stage success rate" value={rate.toFixed(1)} unit="%"
            note={rate >= 95 ? "of runs that finished or failed"
                : `${(100 - rate).toFixed(1)}% of runs failed`}
            bad={rate < 95} />

        <Kpi label="Median part turnaround"
            value={secs(model.MedianTurnaroundSeconds ?? 0)}
            note="summed across every stage of a part" />

        <Kpi label="Quoted value" value={money(model.QuotedValue ?? 0)}
            note={failed > 0
                ? `${failed} failed job${failed === 1 ? "" : "s"}, ${model.OpenJobs ?? 0} open`
                : `${model.OpenJobs ?? 0} job${model.OpenJobs === 1 ? "" : "s"} open`}
            bad={failed > 0} />
    </div>;
}

function Kpi({ label, value, unit, note, bad }: {
    label: string, value: string, unit?: string, note?: string, bad?: boolean
}) {
    return <div class="card kpi">
        <p class="label">{label}</p>
        <div class="value">{value}{unit ? <span class="unit">{unit}</span> : null}</div>
        {note ? <div class={["note", bad && "is-bad"]}>{note}</div> : null}
    </div>;
}

// ------------------------------------------------------------ chart plumbing

const BAND = 30;        // vertical slot per row
const BAR = 14;         // mark thickness, well under the 24px cap
const GAP = 2;          // the surface gap between touching segments
const RADIUS = 4;       // rounded data end
const LABEL_W = 132;    // category gutter
const VALUE_W = 62;     // room for the direct label past the bar

/**
 * A bar with a rounded data end and a square baseline end, per the mark spec.
 * A plain rect with rx would round the baseline corners too, which detaches
 * the bar from its axis.
 */
function barPath(x: number, y: number, w: number, h: number): string {
    const r = Math.min(RADIUS, Math.max(0, w));
    if (w <= 0)
        return "";
    return `M${x},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} ` +
        `V${y + h - r} A${r},${r} 0 0 1 ${x + w - r},${y + h} H${x} Z`;
}

/** Square both ends -- an interior segment of a stack. */
function segPath(x: number, y: number, w: number, h: number): string {
    return w <= 0 ? "" : `M${x},${y} h${w} v${h} h${-w} Z`;
}

function niceMax(v: number): number {
    if (v <= 0)
        return 1;
    const mag = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}

/** Attach the tooltip text a mark should show on hover. */
function tip(node: any, text: string) {
    node.setAttribute("data-tip", text);
    return node;
}

/**
 * Only the stacked charts get one. A single-series chart needs no legend --
 * there is one colour, and the title already says what is plotted, so a
 * one-swatch box restates the title and costs a row of space.
 */
function Legend({ items }: { items: { color: string, label: string }[] }) {
    return <ul class="legend">
        {items.map(i => <li>
            <span class="sw" style={`background:${i.color}`} />{i.label}
        </li>)}
    </ul>;
}

/**
 * A card whose chart can be swapped for the same numbers as a table.
 * Required, not a nicety: the light-mode warning hue sits under 3:1 against the
 * surface, and a table view is one of the two accepted reliefs for that.
 */
function ChartCard({ title, subtitle, chart, table, wide }: {
    title: string, subtitle: string, chart: any, table: any, wide?: boolean
}) {
    const chartBox = <div>{chart}</div> as HTMLElement;
    const tableBox = <div style="display:none">{table}</div> as HTMLElement;
    const button = <button class="toggle" type="button">Show table</button> as HTMLButtonElement;

    let showingTable = false;
    button.addEventListener("click", () => {
        showingTable = !showingTable;
        chartBox.style.display = showingTable ? "none" : "";
        tableBox.style.display = showingTable ? "" : "none";
        button.textContent = showingTable ? "Show chart" : "Show table";
    });

    return <section class={["card", wide && "span-2"]}>
        <div class="card-head"><h2>{title}</h2>{button}</div>
        <p class="sub">{subtitle}</p>
        {chartBox}
        {tableBox}
    </section>;
}

// ------------------------------------------------------- stage duration card

function StageDurationCard({ stages }: { stages: StageDuration[] }) {
    if (!stages.length)
        return <EmptyCard title="Where the pipeline spends its time"
            subtitle="No completed stage runs recorded yet." />;

    // Scaled to the means, not to the slowest run. The worst title-block run is
    // six times its own mean, so a max-driven axis squeezed every bar into the
    // left third and made the comparison the chart exists for the hard one to
    // read. The slowest run is still a click away, in the tooltip and table.
    const max = niceMax(Math.max(...stages.map(s => s.AvgSeconds ?? 0)));
    const height = stages.length * BAND + 26;

    return <ChartCard
        title="Where the pipeline spends its time"
        subtitle="Mean seconds per completed stage run, slowest first. Hover a bar for its worst run."
        chart={
            <svg viewBox={`0 0 640 ${height}`} role="img"
                aria-label="Mean duration of each pipeline stage, in seconds">
                <Ticks max={max} height={stages.length * BAND} />
                {stages.map((s, i) => {
                    const y = i * BAND;
                    const plot = 640 - LABEL_W - VALUE_W;
                    const w = Math.max(0, (plot * (s.AvgSeconds ?? 0)) / max);

                    return <g class="row-g">
                        <rect class="hit" x="0" y={y} width="640" height={BAND} />
                        <text class="cat" x="0" y={y + BAND / 2 + 4}>{pretty(s.Stage)}</text>
                        {tip(<path d={barPath(LABEL_W, y + (BAND - BAR) / 2, w, BAR)}
                            fill="var(--series)" />,
                            `${pretty(s.Stage)} — mean ${secs(s.AvgSeconds)}, slowest ${secs(s.MaxSeconds)}, ${s.Runs} run${s.Runs === 1 ? "" : "s"}`)}
                        <text class="val" x={LABEL_W + w + 8} y={y + BAND / 2 + 4}>
                            {secs(s.AvgSeconds)}
                        </text>
                    </g>;
                })}
            </svg>}
        table={<table>
            <thead><tr><th>Stage</th><th class="num">Mean</th><th class="num">Slowest</th><th class="num">Runs</th></tr></thead>
            <tbody>{stages.map(s => <tr>
                <td>{pretty(s.Stage)}</td>
                <td class="num">{secs(s.AvgSeconds)}</td>
                <td class="num">{secs(s.MaxSeconds)}</td>
                <td class="num">{s.Runs}</td>
            </tr>)}</tbody>
        </table>} />;
}

function Ticks({ max, height }: { max: number, height: number }) {
    const plot = 640 - LABEL_W - VALUE_W;
    const steps = [0, .25, .5, .75, 1];
    return <>
        {steps.map(f => {
            const x = LABEL_W + plot * f;
            return <>
                <line class="gridline" x1={x} x2={x} y1="0" y2={height} />
                <text class="tick" x={x} y={height + 14} text-anchor="middle">
                    {secs(max * f)}
                </text>
            </>;
        })}
        <line class="baseline" x1={LABEL_W} x2={LABEL_W} y1="0" y2={height} />
    </>;
}

// -------------------------------------------------------- stacked-bar shared

interface Seg { value: number; color: string; label: string; }

/**
 * One stacked row. Segments are separated by a 2px gap in the surface colour
 * rather than a stroke, and only the final segment carries the rounded end.
 * A segment is labelled inline only when the text actually fits -- otherwise
 * the number lives in the legend, the tooltip and the table, never clipped.
 */
function StackedRow({ y, label, segs, total, plotX, plotW, rowTip }: {
    y: number, label: string, segs: Seg[], total: number,
    plotX: number, plotW: number, rowTip: string
}) {
    let cursor = plotX;
    const barY = y + (BAND - BAR) / 2;
    const drawn = segs.filter(s => s.value > 0);

    return <g class="row-g">
        <rect class="hit" x="0" y={y} width="640" height={BAND} />
        <text class="cat" x="0" y={y + BAND / 2 + 4}>{label}</text>
        {drawn.map((s, i) => {
            const isLast = i === drawn.length - 1;
            const raw = total > 0 ? (plotW * s.value) / total : 0;
            const w = Math.max(0, raw - (isLast ? 0 : GAP));
            const x = cursor;
            cursor += raw;

            // ~7px per digit at 12px semibold, plus 8px padding each side.
            const text = String(s.value);
            const fits = w >= text.length * 7 + 16;

            return <>
                {tip(<path d={isLast ? barPath(x, barY, w, BAR) : segPath(x, barY, w, BAR)}
                    fill={s.color} />, `${label} — ${s.label}: ${s.value}`)}
                {fits ? <text class="val" x={x + w / 2} y={y + BAND / 2 + 4}
                    text-anchor="middle" fill={s.color === "var(--st-warning)" ? "#0b0b0b" : "#ffffff"}>
                    {text}
                </text> : null}
            </>;
        })}
        {tip(<text class="tick" x={plotX + plotW + 8} y={y + BAND / 2 + 4}>{total}</text>, rowTip)}
    </g>;
}

// ------------------------------------------------------------- pipeline card

function PipelineStepCard({ steps, parts }: { steps: PipelineStepStatus[], parts: number }) {
    if (!steps.length)
        return <EmptyCard title="Pipeline status by step" subtitle="No parts yet." />;

    const legend = [
        { color: "var(--st-good)", label: "Completed" },
        { color: "var(--st-warning)", label: "Pending" },
        { color: "var(--st-critical)", label: "Failed" },
        { color: "var(--st-na)", label: "No drawing" }
    ];
    const plotX = LABEL_W, plotW = 640 - LABEL_W - 40;
    const height = steps.length * BAND + 6;

    return <ChartCard
        title="Pipeline status by step"
        subtitle={`Where each of the ${parts} parts currently sits, per step of the pipeline.`}
        chart={<>
            <svg viewBox={`0 0 640 ${height}`} role="img"
                aria-label="Part counts by status for each pipeline step">
                {steps.map((s, i) => <StackedRow
                    y={i * BAND} label={s.Step} plotX={plotX} plotW={plotW}
                    total={s.Completed + s.Pending + s.Failed + s.NotApplicable}
                    rowTip={`${s.Step}: ${s.Completed} completed, ${s.Pending} pending, ${s.Failed} failed, ${s.NotApplicable} with no drawing`}
                    segs={[
                        { value: s.Completed, color: "var(--st-good)", label: "Completed" },
                        { value: s.Pending, color: "var(--st-warning)", label: "Pending" },
                        { value: s.Failed, color: "var(--st-critical)", label: "Failed" },
                        { value: s.NotApplicable, color: "var(--st-na)", label: "No drawing" }
                    ]} />)}
            </svg>
            <Legend items={legend} />
        </>}
        table={<table>
            <thead><tr><th>Step</th><th class="num">Completed</th><th class="num">Pending</th><th class="num">Failed</th><th class="num">No drawing</th></tr></thead>
            <tbody>{steps.map(s => <tr>
                <td>{s.Step}</td>
                <td class="num">{s.Completed}</td>
                <td class="num">{s.Pending}</td>
                <td class="num">{s.Failed}</td>
                <td class="num">{s.NotApplicable}</td>
            </tr>)}</tbody>
        </table>} />;
}

// ----------------------------------------------------------------- lane card

function LaneOutcomeCard({ lanes }: { lanes: LaneOutcome[] }) {
    if (!lanes.length)
        return <EmptyCard title="Queue outcomes by lane" subtitle="Nothing has been queued yet." />;

    const legend = [
        { color: "var(--st-good)", label: "Completed" },
        { color: "var(--st-warning)", label: "Open" },
        { color: "var(--st-critical)", label: "Failed" }
    ];
    const plotX = LABEL_W, plotW = 640 - LABEL_W - 40;
    const height = lanes.length * BAND + 6;

    return <ChartCard
        title="Queue outcomes by lane"
        subtitle="Job attempts per lane. A lane retries, so these count runs rather than parts."
        chart={<>
            <svg viewBox={`0 0 640 ${height}`} role="img"
                aria-label="Queue job outcomes for each lane">
                {lanes.map((l, i) => <StackedRow
                    y={i * BAND} label={pretty(l.Lane)} plotX={plotX} plotW={plotW}
                    total={l.Completed + l.Open + l.Failed}
                    rowTip={`${pretty(l.Lane)}: ${l.Completed} completed, ${l.Open} open, ${l.Failed} failed`}
                    segs={[
                        { value: l.Completed, color: "var(--st-good)", label: "Completed" },
                        { value: l.Open, color: "var(--st-warning)", label: "Open" },
                        { value: l.Failed, color: "var(--st-critical)", label: "Failed" }
                    ]} />)}
            </svg>
            <Legend items={legend} />
        </>}
        table={<table>
            <thead><tr><th>Lane</th><th class="num">Completed</th><th class="num">Open</th><th class="num">Failed</th><th class="num">Failure rate</th></tr></thead>
            <tbody>{lanes.map(l => {
                const done = l.Completed + l.Failed;
                return <tr>
                    <td>{pretty(l.Lane)}</td>
                    <td class="num">{l.Completed}</td>
                    <td class="num">{l.Open}</td>
                    <td class="num">{l.Failed}</td>
                    <td class="num">{done ? pct(l.Failed, done).toFixed(0) + "%" : "-"}</td>
                </tr>;
            })}</tbody>
        </table>} />;
}

// ----------------------------------------------------------------- cost card

function CostCard({ costs }: { costs: CostCategory[] }) {
    if (!costs.length)
        return <EmptyCard title="Quoted value by cost line"
            subtitle="No priced cost lines yet." />;

    const total = costs.reduce((a, c) => a + (c.Total ?? 0), 0);
    const max = Math.max(...costs.map(c => c.Total ?? 0));
    const height = costs.length * BAND + 6;
    const plotW = 640 - LABEL_W - 92;

    return <ChartCard
        title="Quoted value by cost line"
        subtitle={`${money(total)} across every part, by the line it was booked to.`}
        chart={
            <svg viewBox={`0 0 640 ${height}`} role="img"
                aria-label="Total quoted value for each cost line">
                {costs.map((c, i) => {
                    const y = i * BAND;
                    const w = max > 0 ? (plotW * (c.Total ?? 0)) / max : 0;
                    return <g class="row-g">
                        <rect class="hit" x="0" y={y} width="640" height={BAND} />
                        <text class="cat" x="0" y={y + BAND / 2 + 4}>{c.Name}</text>
                        {tip(<path d={barPath(LABEL_W, y + (BAND - BAR) / 2, w, BAR)}
                            fill="var(--series)" />,
                            `${c.Name} — ${money(c.Total)} over ${c.Lines} line${c.Lines === 1 ? "" : "s"} (${pct(c.Total, total).toFixed(1)}% of the quote)`)}
                        <text class="val" x={LABEL_W + w + 8} y={y + BAND / 2 + 4}>
                            {money(c.Total)}
                        </text>
                    </g>;
                })}
            </svg>}
        table={<table>
            <thead><tr><th>Cost line</th><th class="num">Total</th><th class="num">Share</th><th class="num">Lines</th></tr></thead>
            <tbody>{costs.map(c => <tr>
                <td>{c.Name}</td>
                <td class="num">{money(c.Total)}</td>
                <td class="num">{pct(c.Total, total).toFixed(1)}%</td>
                <td class="num">{c.Lines}</td>
            </tr>)}</tbody>
        </table>} />;
}

// -------------------------------------------------------------- failure card

function FailureCard({ failures }: { failures: PipelineFailure[] }) {
    return <section class="card span-2">
        <div class="card-head"><h2>Recent failures</h2></div>
        <p class="sub">
            Failed stage runs and failed queue jobs, newest first. Neither list
            contains the other: a stage can fail inside a job the queue records
            as complete, and a job can fail before any stage starts.
        </p>
        {failures.length === 0
            ? <p class="empty">Nothing has failed. </p>
            : <table class="failures">
                <thead><tr>
                    <th class="c-part">Part</th>
                    <th class="c-stage">Stage</th>
                    <th class="c-when">When</th>
                    <th>Detail</th>
                </tr></thead>
                <tbody>{failures.map(f => <tr>
                    <td>
                        <a href={`Costing/CostingParts?id=${f.CostingPartId}`}>
                            {f.PartNumber || `#${f.CostingPartId}`}
                        </a>
                    </td>
                    <td><span class="pill">
                        <span class="dot" style="background:var(--st-critical)" />
                        {pretty(f.Stage)}
                    </span></td>
                    <td class="mono">{f.When}</td>
                    <td class="mono detail" title={f.Detail || ""}>
                        {f.Detail || "no detail recorded"}
                    </td>
                </tr>)}</tbody>
            </table>}
    </section>;
}

function EmptyCard({ title, subtitle }: { title: string, subtitle: string }) {
    return <section class="card">
        <div class="card-head"><h2>{title}</h2></div>
        <p class="empty">{subtitle}</p>
    </section>;
}

// -------------------------------------------------------------- hover layer

/**
 * One tooltip element for the whole page, moved to whichever mark is hovered.
 * Delegated rather than per-mark so adding a chart costs nothing, and driven
 * by `data-tip` so a mark opts in simply by carrying the attribute.
 */
function mountTooltip(host: HTMLElement) {
    const el = <div style={
        "position:fixed;z-index:2000;pointer-events:none;opacity:0;transition:opacity .08s;" +
        "background:var(--surface);color:var(--ink);border:1px solid var(--hairline);" +
        "border-radius:6px;padding:6px 9px;font-size:12px;max-width:320px;" +
        "box-shadow:0 4px 14px rgba(0,0,0,.16)"
    } /> as HTMLElement;
    host.append(el);

    host.addEventListener("mouseover", e => {
        const t = (e.target as Element)?.closest?.("[data-tip]");
        if (!t)
            return;
        el.textContent = t.getAttribute("data-tip");
        el.style.opacity = "1";
    });

    host.addEventListener("mousemove", e => {
        if (el.style.opacity !== "1")
            return;
        const pad = 14;
        const r = el.getBoundingClientRect();
        // Flip before the edge rather than after, so the tip never causes a
        // scrollbar on a chart that reaches the viewport edge.
        const x = e.clientX + pad + r.width > window.innerWidth
            ? e.clientX - pad - r.width : e.clientX + pad;
        const y = e.clientY + pad + r.height > window.innerHeight
            ? e.clientY - pad - r.height : e.clientY + pad;
        el.style.left = Math.max(4, x) + "px";
        el.style.top = Math.max(4, y) + "px";
    });

    host.addEventListener("mouseout", e => {
        if ((e.target as Element)?.closest?.("[data-tip]"))
            el.style.opacity = "0";
    });
}
