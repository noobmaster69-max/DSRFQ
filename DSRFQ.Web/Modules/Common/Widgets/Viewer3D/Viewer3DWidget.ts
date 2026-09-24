import {
    EmbeddedViewer,
    Camera,
    Coord3D,
    RGBColor,
    RGBAColor,
    EdgeSettings,
    EnvironmentSettings,
    ProjectionMode,
    IntersectionMode,
    MeshInstanceId,
    Exporter,
    ExporterSettings,
    FileFormat,
    GetBoundingBox,
    CalculateVolume,
    CalculateSurfaceArea,
    IsTwoManifold,
    SubCoord3D,
    Unit
} from 'online-3d-viewer';
import {getIcon} from "@/Common/Widgets/Viewer3D/Viewer3DIcons";

/** One row of the assembly tree, flattened for rendering. */
interface TreeRow {
    key: string;          // MeshInstanceId key, or "node:<id>" for a grouping node
    isMesh: boolean;
    depth: number;
    label: string;
    nodeId: number;
    meshIndex?: number;
}

/**
 * The 3D mode of the costing workspace stage: an online-3d-viewer EmbeddedViewer
 * plus the chrome it does not ship — preset views, a model-stats readout and an
 * assembly tree wired to click-to-pick.
 *
 * Everything here uses the library's public engine API only. The upstream
 * navigator/settings/measure UI lives in their `website/` app, which is not
 * part of the npm package, so it cannot be reused.
 *
 * Ported from DS_ERP Strategy3DWidget. Only the getIcon import changed — the
 * class names and structure are unchanged so the two stay diffable.
 */
export class Viewer3DWidget {
    private host: HTMLElement;
    private canvasEl: HTMLElement;
    private dockEl: HTMLElement;
    private viewer: EmbeddedViewer | null = null;

    private model: any = null;
    private rows: TreeRow[] = [];
    private hidden: Set<string> = new Set();
    private selectedKey: string | null = null;
    private dockTab: 'tree' | 'info' = 'info';
    private dockOpen: boolean = true;
    private showEdges: boolean = true;
    private orthographic: boolean = false;
    /* Follows the Serenity theme on first load; the toolbar button still
       toggles it, because a pale STEP can read better on either ground.
       The theme lives in a class on <html> (theme-azure-light /
       theme-glassy-light / theme-cosmos-dark) — data-bs-theme is never flipped
       by this app, so reading it always reported light. */
    private darkBackground: boolean =
        typeof document !== 'undefined' &&
        /-dark\b/.test(document.documentElement.className);
    /** Whether the current model has been framed against a real-sized canvas. */
    private hasFitted: boolean = false;

    private static readonly HIGHLIGHT = new RGBColor(56, 132, 255);

    /**
     * Light is the default: an untextured STEP imports as pale grey, which all
     * but disappears against a dark slate background.
     */
    private static readonly THEMES = {
        light: {
            background: new RGBAColor(238, 242, 246, 255),
            edge: new RGBColor(71, 85, 105),
            // Darker than the library's own (200,200,200) so the body of the
            // solid still reads as a shape on a light ground.
            model: new RGBColor(150, 158, 168),
            line: new RGBColor(90, 98, 110)
        },
        dark: {
            background: new RGBAColor(30, 41, 59, 255),
            edge: new RGBColor(148, 163, 184),
            model: new RGBColor(203, 213, 225),
            line: new RGBColor(148, 163, 184)
        }
    };

    private theme() {
        return this.darkBackground ? Viewer3DWidget.THEMES.dark : Viewer3DWidget.THEMES.light;
    }

    constructor(host: HTMLElement) {
        this.host = host;
        this.renderShell();
    }

    // ─── Public surface ──────────────────────────────────────────────────

    public hasModel(): boolean { return this.model != null; }

    public loadFromUrl(url: string) {
        this.ensureViewer();
        this.hasFitted = false;
        this.setBusy(true);
        this.viewer.LoadModelFromUrlList([url]);
    }

    public loadFromFile(file: File) {
        this.ensureViewer();
        this.hasFitted = false;
        this.setBusy(true);
        this.viewer.LoadModelFromFileList([file]);
    }

    /**
     * Called when the 3D tab becomes visible. The canvas has no size while its
     * bootstrap pane is hidden, so a model that loaded in the background was
     * framed against a 0x0 viewport — re-fit the first time we get real pixels.
     */
    public resize() {
        if (!this.viewer) return;
        this.viewer.Resize();
        if (!this.hasFitted && this.model && this.canvasEl.clientWidth > 0) {
            this.hasFitted = true;
            this.fit();
        }
    }

    /**
     * Pushes the current theme into the viewer and onto the surrounding chrome.
     * The model's own colour cannot be restyled after import — defaultColor is
     * baked in at load — so a theme switch reloads nothing and only the
     * background and edges change for an already-loaded model.
     */
    private applyTheme() {
        const t = this.theme();
        const v = this.viewer?.GetViewer();
        if (v) {
            v.SetBackgroundColor(t.background);
            v.SetEdgeSettings(new EdgeSettings(this.showEdges, t.edge, 1));
        }
        this.host.querySelector('.st3-root')?.classList.toggle('is-dark', this.darkBackground);
    }

    public destroy() {
        this.viewer?.Destroy();
        this.viewer = null;
    }

    /**
     * Re-exports the loaded model as binary glTF. Used to cache a STEP as a glb
     * so later opens need neither the occt wasm nor the CDN it is fetched from.
     * Resolves null when there is nothing loaded or the exporter fails.
     */
    public exportGlb(): Promise<Blob | null> {
        return new Promise(resolve => {
            if (!this.model) { resolve(null); return; }
            try {
                // ExporterSettings declares its argument as required even though
                // the implementation tolerates undefined; `{}` keeps the defaults.
                new Exporter().Export(this.model, new ExporterSettings({}), FileFormat.Binary, 'glb', {
                    onSuccess: (files: any[]) => {
                        const buffer = files?.[0]?.GetBufferContent();
                        resolve(buffer ? new Blob([buffer], { type: 'model/gltf-binary' }) : null);
                    },
                    onError: () => resolve(null)
                });
            } catch (e) {
                console.error('glb export failed', e);
                resolve(null);
            }
        });
    }

    // ─── Viewer lifecycle ────────────────────────────────────────────────

    private ensureViewer() {
        if (this.viewer) return;

        const t = this.theme();
        this.viewer = new EmbeddedViewer(this.canvasEl, {
            backgroundColor: t.background,
            defaultColor: t.model,
            defaultLineColor: t.line,
            edgeSettings: new EdgeSettings(this.showEdges, t.edge, 1),
            environmentSettings: new EnvironmentSettings([], false),
            onModelLoaded: () => this.onModelLoaded(),
            onModelLoadFailed: () => this.onModelLoadFailed()
        });

        // Click-to-pick. The click handler fires only on a genuine click, not at
        // the end of an orbit drag, so it will not fight with navigation.
        this.viewer.GetViewer().SetMouseClickHandler((button: number, coords: any) => {
            if (button !== 1) return;
            const hit = this.viewer.GetViewer()
                .GetMeshIntersectionUnderMouse(IntersectionMode.MeshOnly, coords);
            const instance = hit?.object?.userData?.originalMeshInstance;
            this.select(instance ? instance.GetId().GetKey() : null, true);
        });
    }

    private onModelLoaded() {
        this.model = this.viewer.GetModel();
        this.hidden.clear();
        this.selectedKey = null;
        this.hasFitted = this.canvasEl.clientWidth > 0;
        this.buildTree();
        this.setBusy(false);
        this.host.querySelector('.st3-empty')?.classList.add('hidden');
        this.renderDock();
        this.renderHud();
    }

    private onModelLoadFailed() {
        this.model = null;
        this.rows = [];
        this.setBusy(false);
        this.renderDock();
        this.renderHud();
        const empty = this.host.querySelector('.st3-empty') as HTMLElement;
        if (empty) {
            empty.classList.remove('hidden');
            empty.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v5"/><path d="M12 16h.01"/>
                </svg>
                <p class="st3-empty-title">Could not load the 3D model</p>
                <p class="st3-empty-sub">STEP/IGES files are converted by a component fetched from
                cdn.jsdelivr.net. If this machine has no internet access, open this part once from a
                connected machine — the converted model is cached and every later open uses it.</p>`;
        }
    }

    private setBusy(busy: boolean) {
        this.host.querySelector('.st3-busy')?.classList.toggle('hidden', !busy);
    }

    // ─── Camera ──────────────────────────────────────────────────────────

    private boundingSphere(): any {
        return this.viewer?.GetViewer().GetBoundingSphere(() => true) ?? null;
    }

    public fit() {
        const sphere = this.boundingSphere();
        if (sphere) this.viewer.GetViewer().FitSphereToWindow(sphere, true);
    }

    /**
     * Preset view. GetFitToSphereCamera keeps the current eye→center direction,
     * so we point the camera down `dir` first and let the fit set the distance.
     */
    private setView(dir: [number, number, number], up: [number, number, number]) {
        const sphere = this.boundingSphere();
        if (!sphere) return;
        const v = this.viewer.GetViewer();
        const c = new Coord3D(sphere.center.x, sphere.center.y, sphere.center.z);
        const d = Math.max(sphere.radius, 1e-6) * 3;
        v.SetCamera(new Camera(
            new Coord3D(c.x + dir[0] * d, c.y + dir[1] * d, c.z + dir[2] * d),
            c,
            new Coord3D(up[0], up[1], up[2]),
            45.0
        ));
        v.FitSphereToWindow(sphere, true);
    }

    private static readonly VIEWS: Record<string, { dir: [number, number, number], up: [number, number, number], label: string }> = {
        iso:    { dir: [ 1,  1,  1], up: [0, 0, 1], label: 'Iso'    },
        front:  { dir: [ 0, -1,  0], up: [0, 0, 1], label: 'Front'  },
        back:   { dir: [ 0,  1,  0], up: [0, 0, 1], label: 'Back'   },
        left:   { dir: [-1,  0,  0], up: [0, 0, 1], label: 'Left'   },
        right:  { dir: [ 1,  0,  0], up: [0, 0, 1], label: 'Right'  },
        top:    { dir: [ 0,  0,  1], up: [0, 1, 0], label: 'Top'    },
        bottom: { dir: [ 0,  0, -1], up: [0, 1, 0], label: 'Bottom' }
    };

    // ─── Selection / visibility ──────────────────────────────────────────

    private select(key: string | null, scrollTree: boolean) {
        this.selectedKey = key;
        const v = this.viewer?.GetViewer();
        if (v) {
            v.SetMeshesHighlight(Viewer3DWidget.HIGHLIGHT, (userData: any) =>
                key != null && userData?.originalMeshInstance?.GetId().GetKey() === key);
        }
        this.paintTreeSelection(scrollTree);
        if (this.dockTab === 'info') this.renderDock();
    }

    private applyVisibility() {
        this.viewer?.GetViewer().SetMeshesVisibility((userData: any) => {
            const id = userData?.originalMeshInstance?.GetId();
            return id ? !this.hidden.has(id.GetKey()) : true;
        });
    }

    private toggleHidden(key: string) {
        if (this.hidden.has(key)) this.hidden.delete(key); else this.hidden.add(key);
        this.applyVisibility();
        this.renderDock();
    }

    /** Show only the given mesh instance. */
    private isolate(key: string) {
        this.hidden = new Set(this.rows.filter(r => r.isMesh && r.key !== key).map(r => r.key));
        this.applyVisibility();
        this.renderDock();
    }

    private showAll() {
        this.hidden.clear();
        this.applyVisibility();
        this.renderDock();
    }

    // ─── Model introspection ─────────────────────────────────────────────

    private buildTree() {
        this.rows = [];
        if (!this.model) return;

        const walk = (node: any, depth: number) => {
            const meshIndices: number[] = node.GetMeshIndices();
            const children: any[] = node.GetChildNodes();

            // Skip pure pass-through wrappers so the tree stays shallow.
            const isRoot = depth < 0;
            if (!isRoot) {
                this.rows.push({
                    key: `node:${node.GetId()}`,
                    isMesh: false,
                    depth,
                    label: node.GetName() || `Node ${node.GetId()}`,
                    nodeId: node.GetId()
                });
            }

            meshIndices.forEach(mi => {
                const mesh = this.model.GetMesh(mi);
                this.rows.push({
                    key: new MeshInstanceId(node.GetId(), mi).GetKey(),
                    isMesh: true,
                    depth: depth + 1,
                    label: (mesh?.GetName?.() || `Mesh ${mi}`),
                    nodeId: node.GetId(),
                    meshIndex: mi
                });
            });

            children.forEach(child => walk(child, depth + 1));
        };

        walk(this.model.GetRootNode(), -1);
    }

    private static readonly UNIT_LABEL: Record<number, string> = {
        [Unit.Millimeter]: 'mm',
        [Unit.Centimeter]: 'cm',
        [Unit.Meter]: 'm',
        [Unit.Inch]: 'in',
        [Unit.Foot]: 'ft'
    };

    private unitLabel(): string {
        const u = this.model?.GetUnit?.();
        return Viewer3DWidget.UNIT_LABEL[u] ?? '';
    }

    private static fmt(n: number, digits = 2): string {
        if (!Number.isFinite(n)) return '—';
        const abs = Math.abs(n);
        if (abs !== 0 && (abs < 0.01 || abs >= 1e7)) return n.toExponential(2);
        return n.toLocaleString(undefined, { maximumFractionDigits: digits });
    }

    /** Stats for the whole model, or for the selected mesh instance if there is one. */
    private computeStats() {
        if (!this.model) return null;

        let target: any = this.model;
        let scope = 'Whole model';
        if (this.selectedKey) {
            const row = this.rows.find(r => r.key === this.selectedKey);
            if (row?.isMesh) {
                const instance = this.model.GetMeshInstance(
                    new MeshInstanceId(row.nodeId, row.meshIndex));
                if (instance) { target = instance; scope = row.label; }
            }
        }

        const box = GetBoundingBox(target);
        const size = box ? SubCoord3D(box.GetMax(), box.GetMin()) : null;

        // CalculateVolume only means anything on a closed, two-manifold solid;
        // on an open mesh it silently returns a plausible-looking wrong number.
        let volume: number | null = null;
        try { if (IsTwoManifold(target)) volume = CalculateVolume(target); } catch { /* ignore */ }

        let area: number | null = null;
        try { area = CalculateSurfaceArea(target); } catch { /* ignore */ }

        return {
            scope,
            size,
            volume,
            area,
            triangles: target.TriangleCount?.() ?? 0,
            vertices: target.VertexCount?.() ?? 0,
            meshes: this.model.MeshCount?.() ?? 0,
            instances: this.model.MeshInstanceCount?.() ?? 0
        };
    }

    // ─── Rendering ───────────────────────────────────────────────────────

    private renderShell() {
        this.host.innerHTML = `
            <div class="st3-root">
                <div class="st3-canvas"></div>
                <div class="st3-empty">
                    <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22v-10"/>
                    </svg>
                    <p class="st3-empty-title">3D Viewer Mode</p>
                    <p class="st3-empty-sub">Load a STEP or GLB file to view in 3D.</p>
                </div>
                <div class="st3-busy hidden"><div class="st3-spinner"></div><span>Loading model…</span></div>
                <aside class="st3-dock"></aside>
                <div class="st3-views"></div>
                <div class="st3-hud"></div>
            </div>`;

        this.canvasEl = this.host.querySelector('.st3-canvas');
        this.dockEl = this.host.querySelector('.st3-dock');
        // The WebGL background is themed via ensureViewer(), but the surrounding
        // HTML chrome is themed by this class — and applyTheme() only ever ran
        // from the toolbar buttons, so a dark start left a light dock over a
        // dark canvas.
        this.host.querySelector('.st3-root')?.classList.toggle('is-dark', this.darkBackground);
        this.renderViews();
        this.renderHud();
        this.renderDock();
    }

    private renderViews() {
        const el = this.host.querySelector('.st3-views') as HTMLElement;
        el.innerHTML = Object.entries(Viewer3DWidget.VIEWS)
            .map(([k, v]) => `<button class="st3-view-btn" data-view="${k}" title="${v.label} view">${v.label}</button>`)
            .join('');
        el.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', () => {
                const v = Viewer3DWidget.VIEWS[(btn as HTMLElement).dataset.view];
                if (v) this.setView(v.dir, v.up);
            });
        });
    }

    private renderHud() {
        const el = this.host.querySelector('.st3-hud') as HTMLElement;
        const loaded = this.hasModel();
        el.innerHTML = `
            <button class="st3-hud-btn" data-act="fit" title="Fit model to view" ${loaded ? '' : 'disabled'}>${getIcon('fit')}</button>
            <button class="st3-hud-btn ${this.orthographic ? 'active' : ''}" data-act="proj" title="${this.orthographic ? 'Orthographic — switch to perspective' : 'Perspective — switch to orthographic'}" ${loaded ? '' : 'disabled'}>${getIcon('cube')}</button>
            <button class="st3-hud-btn ${this.showEdges ? 'active' : ''}" data-act="edges" title="Show model edges" ${loaded ? '' : 'disabled'}>${getIcon('drawBox')}</button>
            <button class="st3-hud-btn ${this.darkBackground ? 'active' : ''}" data-act="bg" title="${this.darkBackground ? 'Dark background — switch to light' : 'Light background — switch to dark'}">${getIcon(this.darkBackground ? 'moon' : 'sun')}</button>
            <span class="st3-hud-sep"></span>
            <button class="st3-hud-btn ${this.dockOpen ? 'active' : ''}" data-act="dock" title="Show model info and part tree">${getIcon('info')}</button>`;

        el.querySelectorAll('[data-act]').forEach(btn => {
            btn.addEventListener('click', () => {
                switch ((btn as HTMLElement).dataset.act) {
                    case 'fit': this.fit(); break;
                    case 'proj':
                        this.orthographic = !this.orthographic;
                        this.viewer?.GetViewer().SetProjectionMode(
                            this.orthographic ? ProjectionMode.Orthographic : ProjectionMode.Perspective);
                        this.renderHud();
                        break;
                    case 'edges':
                        this.showEdges = !this.showEdges;
                        this.applyTheme();
                        this.renderHud();
                        break;
                    case 'bg':
                        this.darkBackground = !this.darkBackground;
                        this.applyTheme();
                        this.renderHud();
                        break;
                    case 'dock':
                        this.dockOpen = !this.dockOpen;
                        this.renderDock();
                        this.renderHud();
                        break;
                }
            });
        });
    }

    private renderDock() {
        this.dockEl.classList.toggle('hidden', !this.dockOpen);
        if (!this.dockOpen) return;

        const body = this.dockTab === 'tree' ? this.treeHtml() : this.infoHtml();
        this.dockEl.innerHTML = `
            <div class="st3-dock-tabs">
                <button class="st3-dock-tab ${this.dockTab === 'info' ? 'active' : ''}" data-tab="info">Info</button>
                <button class="st3-dock-tab ${this.dockTab === 'tree' ? 'active' : ''}" data-tab="tree">Parts${this.rows.length ? ` <span class="st-count">${this.rows.filter(r => r.isMesh).length}</span>` : ''}</button>
            </div>
            <div class="st3-dock-body">${body}</div>`;

        this.dockEl.querySelectorAll('[data-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.dockTab = (btn as HTMLElement).dataset.tab as 'tree' | 'info';
                this.renderDock();
            });
        });
        this.bindTreeEvents();
    }

    private infoHtml(): string {
        const s = this.computeStats();
        if (!s) return `<p class="st3-note">No model loaded.</p>`;

        const u = this.unitLabel();
        const dim = s.size
            ? `${Viewer3DWidget.fmt(s.size.x)} × ${Viewer3DWidget.fmt(s.size.y)} × ${Viewer3DWidget.fmt(s.size.z)}${u ? ' ' + u : ''}`
            : '—';

        const row = (label: string, value: string, hint = '') =>
            `<div class="st3-stat"><span class="st3-stat-k" ${hint ? `title="${hint}"` : ''}>${label}</span><span class="st3-stat-v">${value}</span></div>`;

        return `
            <div class="st3-scope">${s.scope}</div>
            ${row('Bounding box', dim, 'Raw stock envelope')}
            ${row('Volume', s.volume != null
                ? `${Viewer3DWidget.fmt(s.volume)}${u ? ` ${u}³` : ''}`
                : '<span class="st3-na">n/a — open mesh</span>',
                'Only computed for a closed, two-manifold solid')}
            ${row('Surface area', s.area != null ? `${Viewer3DWidget.fmt(s.area)}${u ? ` ${u}²` : ''}` : '—')}
            ${row('Triangles', Viewer3DWidget.fmt(s.triangles, 0))}
            ${row('Vertices', Viewer3DWidget.fmt(s.vertices, 0))}
            ${row('Parts', `${Viewer3DWidget.fmt(s.instances, 0)} in ${Viewer3DWidget.fmt(s.meshes, 0)} mesh${s.meshes === 1 ? '' : 'es'}`)}
            ${u ? '' : `<p class="st3-note">The file declares no unit, so lengths are unitless model values.</p>`}
            ${this.selectedKey ? `<button class="st3-link" data-act="clear-sel">Clear selection</button>` : ''}`;
    }

    private treeHtml(): string {
        if (!this.rows.length) return `<p class="st3-note">No parts to show.</p>`;

        const rows = this.rows.map(r => {
            const isHidden = r.isMesh && this.hidden.has(r.key);
            const selected = r.isMesh && this.selectedKey === r.key;
            return `
                <div class="st3-tree-row ${r.isMesh ? 'is-mesh' : 'is-node'} ${selected ? 'is-selected' : ''} ${isHidden ? 'is-hidden' : ''}"
                     data-key="${r.key}" style="padding-left:${6 + r.depth * 12}px">
                    <span class="st3-tree-label" title="${r.label}">${r.label}</span>
                    ${r.isMesh ? `
                        <button class="st3-tree-btn" data-isolate="${r.key}" title="Isolate this part">${getIcon('scanEye')}</button>
                        <button class="st3-tree-btn" data-vis="${r.key}" title="${isHidden ? 'Show' : 'Hide'} this part">${getIcon(isHidden ? 'eyeOff' : 'eye')}</button>
                    ` : ''}
                </div>`;
        }).join('');

        return `
            ${this.hidden.size ? `<button class="st3-link" data-act="show-all">Show all (${this.hidden.size} hidden)</button>` : ''}
            <div class="st3-tree">${rows}</div>`;
    }

    private bindTreeEvents() {
        this.dockEl.querySelector('[data-act="show-all"]')?.addEventListener('click', () => this.showAll());
        this.dockEl.querySelector('[data-act="clear-sel"]')?.addEventListener('click', () => this.select(null, false));

        this.dockEl.querySelectorAll('.st3-tree-row.is-mesh').forEach(row => {
            row.addEventListener('click', e => {
                if ((e.target as HTMLElement).closest('.st3-tree-btn')) return;
                const key = (row as HTMLElement).dataset.key;
                this.select(this.selectedKey === key ? null : key, false);
            });
        });

        this.dockEl.querySelectorAll('[data-vis]').forEach(btn => {
            btn.addEventListener('click', () => this.toggleHidden((btn as HTMLElement).dataset.vis));
        });
        this.dockEl.querySelectorAll('[data-isolate]').forEach(btn => {
            btn.addEventListener('click', () => this.isolate((btn as HTMLElement).dataset.isolate));
        });
    }

    private paintTreeSelection(scroll: boolean) {
        this.dockEl.querySelectorAll('.st3-tree-row').forEach(row => {
            const isSel = (row as HTMLElement).dataset.key === this.selectedKey;
            row.classList.toggle('is-selected', isSel);
            if (isSel && scroll) row.scrollIntoView({ block: 'nearest' });
        });
    }
}
