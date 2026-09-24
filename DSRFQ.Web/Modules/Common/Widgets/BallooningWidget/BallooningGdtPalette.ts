/**
 * The Y14.5 symbol editor that opens when the Symbol field takes focus.
 *
 * Ported from DS_ERP's font modal: parse Y14.5M-2009.ttf with opentype.js,
 * register it with the browser, and lay out EVERY glyph the font's cmap
 * declares. A curated list is smaller and prettier and does not do the job -
 * the font carries the full ASME Y14.5 repertoire including the composed
 * feature-control-frame pieces, and an operator transcribing a frame needs the
 * ones nobody thought to curate.
 *
 * Two things are kept from the curated version because they cost nothing:
 * known glyphs are given their proper engineering name rather than the font's
 * internal one, and a filter box narrows a couple of hundred cells to the few
 * you want.
 */

import opentype from "opentype.js";

const FONT_URL = "/Content/site/Y14.5M-2009.ttf";
const FONT_FAMILY = "Y14_5M_Editor";

/**
 * Engineering names for glyphs the font exposes at their real Unicode point.
 *
 * Mostly inert with Y14.5M-2009, and that is worth knowing rather than
 * discovering later: this face is a SYMBOL font wearing Latin clothes. Its
 * cmap is 337 ordinary code points named space, exclam, zero, adieresis - but
 * the outline drawn for each is a GD&T symbol. Typing "j" in it prints the
 * position symbol. That is why the recogniser reports Y14.5 text as things
 * like "{¿~|Ø~.005~Ì|A|B}" - those are Latin characters standing in for
 * symbols.
 *
 * So the operator picks by SHAPE, from the rendered grid, exactly as in
 * DS_ERP. This map only adds a friendly name on the rare glyph a font does
 * expose at its true code point.
 */
const KNOWN_NAMES: Record<string, string> = {
    "⏤": "Straightness", "▱": "Flatness", "○": "Circularity", "⌭": "Cylindricity",
    "⌒": "Profile of a line", "⌓": "Profile of a surface",
    "∠": "Angularity", "⊥": "Perpendicularity", "∥": "Parallelism",
    "⌖": "Position", "◎": "Concentricity", "⌯": "Symmetry",
    "↗": "Circular runout", "⌰": "Total runout",
    "Ⓜ": "Maximum material condition", "Ⓛ": "Least material condition",
    "Ⓟ": "Projected tolerance zone", "Ⓕ": "Free state",
    "Ⓣ": "Tangent plane", "Ⓢ": "Regardless of feature size",
    "⌀": "Diameter", "□": "Square", "±": "Plus / minus", "°": "Degree",
    "⌴": "Counterbore / spotface", "⌵": "Countersink", "↧": "Depth",
};

let fontPromise: Promise<any> | null = null;

/**
 * Parse the font once per page and register it with the browser.
 *
 * Cached: the palette is rebuilt every time the Symbol field is focused, and
 * re-fetching and re-parsing 41 KB of TrueType on each of those is wasted work
 * that shows up as a visible stall.
 */
function loadFont(): Promise<any> {
    if (fontPromise) return fontPromise;
    fontPromise = (async () => {
        const res = await fetch(FONT_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status} fetching the Y14.5 font`);
        const buf = await res.arrayBuffer();

        // Registered under its own family name so it cannot collide with the
        // Y14_5M face site.css declares for the rest of the widget.
        try {
            const face = new FontFace(FONT_FAMILY, buf);
            document.fonts.add(await face.load());
        } catch {
            // Rendering falls back to the site.css face; the grid still works.
        }
        return opentype.parse(buf);
    })().catch(err => {
        fontPromise = null;          // let a later focus retry
        throw err;
    });
    return fontPromise;
}

export interface GlyphEntry {
    char: string;
    /** Engineering name where known, else the font's own glyph name. */
    name: string;
    /** As printed in the footer - PUA codes shown without the F000 offset. */
    hex: string;
}

/**
 * Every glyph the font's cmap declares, in code-point order.
 *
 * The cmap is read whole rather than by range: this face puts most of its
 * symbols in the F020-F0FF private-use area that Windows reads through the
 * (3,0) Symbol subtable, and a Unicode-only scan finds almost nothing.
 */
export function glyphsFromFont(font: any): GlyphEntry[] {
    const map = font?.tables?.cmap?.glyphIndexMap ?? {};
    const out: GlyphEntry[] = [];

    for (const key of Object.keys(map).map(Number).sort((a, b) => a - b)) {
        const glyph = font.glyphs.get(map[key]);
        if (!glyph || glyph.name === ".notdef") continue;

        const char = String.fromCodePoint(key);
        // A private-use code point is meaningless as F0B1; show B1, which is
        // what the font's own documentation and Windows Character Map use.
        const shown = (key >= 0xf020 && key <= 0xf0ff) ? key - 0xf000 : key;
        out.push({
            char,
            name: KNOWN_NAMES[char] || glyph.name || `Glyph ${map[key]}`,
            hex: shown.toString(16).toUpperCase().padStart(4, "0"),
        });
    }
    return out;
}

const esc = (s: string) => String(s ?? "").replace(/[&<>"]/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

/**
 * Insert text at the caret, keeping the caret after what was inserted.
 *
 * Replaces the selection when there is one, so a symbol can be swapped by
 * selecting it and clicking another.
 */
export function insertAtCaret(field: HTMLTextAreaElement | HTMLInputElement,
                              text: string): void {
    const start = field.selectionStart ?? field.value.length;
    const end = field.selectionEnd ?? start;
    field.value = field.value.slice(0, start) + text + field.value.slice(end);
    const caret = start + text.length;
    field.selectionStart = field.selectionEnd = caret;
}

/**
 * Build the editor. Returns immediately with a loading shell; the grid fills
 * in when the font has parsed.
 */
export function buildGdtPalette(
    field: HTMLTextAreaElement,
    onInsert: (value: string) => void,
    onClose: () => void
): HTMLElement {
    const el = document.createElement("div");
    el.className = "ab-gdt-palette";
    el.innerHTML = `
      <div class="ab-gdt-head">
        <span class="ab-gdt-title">Y14.5 symbols</span>
        <button type="button" class="ab-gdt-close" title="Close (Esc)">&times;</button>
      </div>
      <div class="ab-gdt-search">
        <input type="text" class="ab-gdt-filter"
               placeholder="Filter by code or glyph name, e.g. 004A or perpendicularity" />
      </div>
      <div class="ab-gdt-grid"><div class="ab-gdt-loading">Reading the font&hellip;</div></div>
      <div class="ab-gdt-foot">
        <span class="ab-gdt-name">&mdash;</span>
        <span class="ab-gdt-code"></span>
      </div>`;

    const grid = el.querySelector(".ab-gdt-grid") as HTMLElement;
    const nameEl = el.querySelector(".ab-gdt-name") as HTMLElement;
    const codeEl = el.querySelector(".ab-gdt-code") as HTMLElement;
    const filterEl = el.querySelector(".ab-gdt-filter") as HTMLInputElement;
    const titleEl = el.querySelector(".ab-gdt-title") as HTMLElement;

    // The field must never lose focus, or the caret is gone by the time the
    // insert runs and the symbol lands at the end of the text. The filter box
    // is exempt - it needs focus of its own to be typed into.
    el.addEventListener("mousedown", e => {
        if (!(e.target as HTMLElement).closest(".ab-gdt-filter")) e.preventDefault();
    });

    let all: GlyphEntry[] = [];

    const paint = (entries: GlyphEntry[]) => {
        grid.innerHTML = entries.length
            ? entries.map(g => `
                <button type="button" class="ab-gdt-cell" data-char="${esc(g.char)}"
                        data-name="${esc(g.name)}" data-hex="${esc(g.hex)}"
                        title="${esc(g.name)} (${esc(g.hex)})">${esc(g.char)}</button>`).join("")
            : `<div class="ab-gdt-loading">Nothing matches that.</div>`;
    };

    filterEl.addEventListener("input", () => {
        const q = filterEl.value.trim().toLowerCase();
        paint(!q ? all : all.filter(g =>
            g.name.toLowerCase().includes(q) || g.hex.toLowerCase().includes(q)));
    });

    el.addEventListener("click", e => {
        const target = e.target as HTMLElement;
        if (target.closest(".ab-gdt-close")) { onClose(); return; }

        const cell = target.closest(".ab-gdt-cell") as HTMLElement;
        if (!cell) return;

        el.querySelectorAll(".ab-gdt-cell.selected")
            .forEach(c => c.classList.remove("selected"));
        cell.classList.add("selected");

        nameEl.textContent = cell.getAttribute("data-name");
        codeEl.textContent = cell.getAttribute("data-hex");

        insertAtCaret(field, cell.getAttribute("data-char") || "");
        onInsert(field.value);
        field.focus();
    });

    loadFont().then(font => {
        all = glyphsFromFont(font);
        const family = font?.names?.fontFamily?.en
            || Object.values(font?.names?.fontFamily ?? {})[0];
        titleEl.textContent = `${family || "Y14.5"} · ${all.length} symbols`;
        paint(all);
    }).catch(err => {
        grid.innerHTML =
            `<div class="ab-gdt-loading ab-gdt-error">Could not read the font: ${esc(String(err.message ?? err))}</div>`;
    });

    return el;
}
