export type ToolMode = 'select' | 'draw_box' | 'draw_box_manual' | 'mask_area'
    | 'draw_region' | 'pan'
    /** One Supply's Area (W) and Single (Q) recognition: drag a box to read. */
    | 'area_ocr' | 'single_ocr'
    /** Drag round the printed drawing border the grid divides. */
    | 'frame_select';

export interface Rect {
    x: number; // Percentage 0-100
    y: number; // Percentage 0-100
    width: number; // Percentage 0-100
    height: number; // Percentage 0-100
}

export interface BalloonAnnotation {
    id: string;
    /**
     * The parent integer - this balloon's position in the sequence. A child
     * balloon shares its parent's number and is distinguished by subNumber, so
     * adding a child never renumbers anything after it.
     */
    balloonNumber: number;
    /**
     * 1-based child index, or undefined for a top-level balloon. Rendered as
     * 5-1 / 5.1; see formatBalloonNumber in BallooningNumbering.
     *
     * Persisted inside BalloonNo, which is nvarchar(40) - wide enough for the
     * composite already, so this needs no schema change.
     */
    subNumber?: number;
    balloonX: number;
    balloonY: number;
    quantity?: number;
    rect: Rect;
    content: string;
    originalContent: string;
    type: string;
    /**
     * MasterFeatureSymbols.Id - the catalogued characteristic this balloon
     * controls, as opposed to `content`, which is only the text that was read.
     * Undefined is a real answer: a plain dimension controls nothing named.
     */
    typeId?: number;
    /** The matched symbol's name, for display only; `typeId` is authoritative. */
    typeName?: string;
    upperTol?: string;
    lowerTol?: string;
    /**
     * Which general tolerance filled the pair above, e.g. ".XXX" or
     * "ISO 2768-1 m". Undefined means the tolerance came off the drawing, and
     * applying a general tolerance must leave it alone.
     */
    toleranceStandard?: string;
    /** MasterInspectionTools.Id - what measures this characteristic. */
    inspectionToolId?: number;
    /** Its code, for display only; `inspectionToolId` is authoritative. */
    inspectionToolName?: string;
    /**
     * This balloon's own grid cell, e.g. "D8" - what the model calls `belong`
     * and what RPA/API's GridSorter reads to order the sheet. "" or
     * "UNMATCHED" means the model could not place it.
     *
     * Not to be confused with gridStart/gridEnd below, which describe the
     * SHEET rather than the balloon.
     */
    section?: string;
    status: 'Pending' | 'Approved' | 'Review';
    pageIndex: number;
    instanceCount?: number;
    auto: boolean;
    /**
     * The SHEET's grid extent, e.g. gridStart "F2" and gridEnd "A1". Every
     * balloon on a page carries the same pair; together they give the grid its
     * origin and the direction each axis runs in. Parsed by parseGridSystem.
     */
    gridStart:string;
    gridEnd:string;
    isNote: boolean;
    /**
     * A datum FEATURE marker - the surface others are measured from, not
     * something measured. Set by the consumer at insert and correctable by
     * hand, since a hollow triangle off a poor scan is misread often enough
     * to matter. Distinct from a datum REFERENCE inside a control frame,
     * which lives in `analyser.datums`.
     */
    isDatum?: boolean;

    // ── One Supply's per-balloon state (DefaultDB_20260915_1000) ──────────
    /** Reviewed - One Supply's 审核, F2. */
    audited?: boolean;
    auditedOn?: string;
    auditedBy?: string;
    /** Appearance; each undefined means the shop default. See BallooningStyle. */
    balloonColor?: string;
    textColor?: string;
    balloonShape?: 'circle' | 'solid' | 'star' | 'triangle';
    balloonLineWidth?: number;
    balloonStyle?: 'default' | 'warning' | 'error' | 'success';
    showArrow?: boolean;
    balloonScale?: number;
    /** The recognition box is hidden; the balloon stays. */
    boxHidden?: boolean;
    /** 'theoretical' (basic) or 'reference'; undefined is an ordinary dimension. */
    dimensionFeature?: '' | 'theoretical' | 'reference';
    /** One Supply's 序号排列 partition - see BallooningFields.NUMBER_CATEGORIES. */
    numberCategory?: string;
    /** What a report shows for it: its text, or a picture of it. */
    exportMode?: 'text' | 'screenshot';
    /** Degrees the crop of this balloon is turned. */
    cropRotation?: number;

    score?: number;
    toleranceScoringId?: number;
    toleranceScoringName?: string;
    toleranceScoringColor?: string;
    analyser:{

        diameter: boolean,
        target?: number,
        lsl?: number,
        usl?: number,
        datums: [],
        modifiers: [],
        fit?: string
    },
    viewId?: number;
    viewRect: Rect;




}

export interface Mask {
    id: string;
    rect: Rect;
    pageIndex: number;
}

export interface DrawingStamp {
    id: string;
    picture: string;
    rect: Rect;
    pageIndex: number;
}

export interface ProjectState {
    imageSrc: string | null;
    annotations: BalloonAnnotation[];
    masks: Mask[];
    scale: number;
    pan: { x: number; y: number };
}


interface Annotation {
    id: string;
    rect: Rect;
    balloonNumber: number;
    pageIndex: number;
    // Read by ForceDirectedBalloonLayout.solve as the preferred anchor. Declared
    // optional because a freshly drawn box may not have a marker position yet;
    // the solver already falls back to the rect corner. (Missing in DS_ERP,
    // where it went unnoticed because that project does not typecheck.)
    balloonX?: number;
    balloonY?: number;
}

interface BalloonPosition {
    x: number;
    y: number;
}

export class SmartBalloonPositioner {
    private containerWidth = 1000;
    private containerHeight = 1400;
    private fdLayout = new ForceDirectedBalloonLayout();

    setContainerSize(width: number, height: number) {
        this.containerWidth = width;
        this.containerHeight = height;
        this.fdLayout.setContainerSize(width, height);
    }

    /** Legacy entry point – balloon radius defaults to a small size */
    calculatePositions(annotations: Annotation[], currentPage: number): Map<string, BalloonPosition> {
        return this.fdLayout.solve(annotations, currentPage, 1.5);
    }
}

// ---------------------------------------------------------------------------
// Force-Directed Balloon Layout
// ---------------------------------------------------------------------------
// Works entirely in % coordinate space so it stays consistent with
// ann.balloonX / ann.balloonY (which are also in %).
//
// Forces applied each tick:
//   • Spring attraction  – pulls each balloon toward its annotation anchor
//   • Balloon repulsion  – circle–circle collision force
//   • Rect repulsion     – pushes balloon outside annotation rectangles
//   • Boundary           – clamps position to [radius, 100-radius]
//
// The simulation runs up to MAX_ITER steps with damped velocity (Verlet-like).
// ---------------------------------------------------------------------------
// export class ForceDirectedBalloonLayout {
//     private containerWidth  = 1000;
//     private containerHeight = 1400;
//
//     // Tuning knobs
//     private readonly MAX_ITER        = 300;
//     private readonly DAMPING         = 0.6;   // velocity damping per tick
//     private readonly SPRING_K        = 0.04;  // attraction to anchor
//     private readonly BALLOON_REPULSE = 3.5;   // balloon–balloon repulsion strength
//     private readonly RECT_REPULSE    = 2.5;   // balloon–rect repulsion strength
//     private readonly ANCHOR_GAP_X_PCT = 0.001;  // extra horizontal gap (%) between balloon edge and rect edge
//     private readonly ANCHOR_GAP_Y_PCT = 0.001;  // extra vertical gap (%) between balloon edge and rect edge
//     private readonly CONVERGE_THRESH = 0.002; // stop early if max displacement < this (%)
//
//     setContainerSize(width: number, height: number) {
//         this.containerWidth  = width;
//         this.containerHeight = height;
//     }
//
//     /**
//      * Compute collision-free balloon positions using force-directed layout.
//      * @param annotations   All BalloonAnnotation objects (any page)
//      * @param currentPage   Only annotations on this page are processed
//      * @param balloonRadiusPct  Balloon radius in % of container height
//      * @returns Map of annotation id → {x, y} in %
//      */
//     solve(
//         annotations: Annotation[],
//         currentPage: number,
//         balloonRadiusPct: number
//     ): Map<string, BalloonPosition> {
//         const page = annotations.filter(a => a.pageIndex === currentPage);
//         const result = new Map<string, BalloonPosition>();
//         if (page.length === 0) return result;
//
//         // Aspect ratio: needed to convert the single balloonRadiusPct (based on height)
//         // into an X-axis equivalent radius for a roughly circular balloon on screen.
//         const aspect = this.containerHeight / this.containerWidth; // typically ~1.4
//         const rx = balloonRadiusPct * aspect; // radius in % along X axis
//         const ry = balloonRadiusPct;          // radius in % along Y axis
//         // For distance comparisons we use an average
//         const rPct = (rx + ry) / 2;
//
//         // ── Node state ────────────────────────────────────────────────────────
//         type Node = {
//             id: string;
//             x: number; y: number;       // current position (% center of balloon)
//             vx: number; vy: number;     // velocity
//             ax: number; ay: number;     // anchor position (% center of balloon ideal start)
//             rect: Rect;                 // annotation rect in %
//         };
//
//         const nodes: Node[] = page.map(ann => {
//             // Compute anchor: preferred position is top-right corner of annotation rect,
//             // offset by one balloon diameter away
//
//
//             const anchorX = Math.min(99, ann.balloonX ?? (ann.rect.x + ann.rect.width + rPct * 2));
//             const anchorY = Math.max(0,  ann.balloonY ?? (ann.rect.y));
//             return {
//                 id: ann.id,
//                 x:  anchorX,
//                 y:  anchorY,
//                 vx: 0, vy: 0,
//                 ax: anchorX,
//                 ay: anchorY,
//                 rect: ann.rect,
//             };
//         });
//
//         // ── Simulation loop ───────────────────────────────────────────────────
//         for (let iter = 0; iter < this.MAX_ITER; iter++) {
//             let maxDisp = 0;
//
//             for (const n of nodes) {
//                 let fx = 0, fy = 0;
//
//                 // 1. Spring: attract to anchor
//                 const dx = n.ax - n.x;
//                 const dy = n.ay - n.y;
//                 fx += this.SPRING_K * dx;
//                 fy += this.SPRING_K * dy;
//
//                 // 2. Balloon–Balloon repulsion (circle–circle)
//                 for (const other of nodes) {
//                     if (other.id === n.id) continue;
//                     const ex = n.x - other.x;
//                     const ey = n.y - other.y;
//                     const dist = Math.sqrt(ex * ex + ey * ey) || 1e-6;
//                     const minDist = rPct * 2 + 0.3; // two radii + tiny gap
//                     if (dist < minDist) {
//                         const overlap = (minDist - dist) / dist;
//                         fx += this.BALLOON_REPULSE * overlap * ex;
//                         fy += this.BALLOON_REPULSE * overlap * ey;
//                     }
//                 }
//
//                 // 3. Balloon–Rect repulsion (push balloon outside ALL rects)
//                 for (const ann of page) {
//                     // compute closest point on rect to balloon center
//                     const r = ann.rect;
//                     const closestX = Math.max(r.x, Math.min(n.x, r.x + r.width));
//                     const closestY = Math.max(r.y, Math.min(n.y, r.y + r.height));
//                     const ex = n.x - closestX;
//                     const ey = n.y - closestY;
//
//                     // Treat the balloon as an ELLIPSE (rx, ry), not a circle of
//                     // radius rPct. Normalize each axis by its own radius + its
//                     // own gap so X clearance and Y clearance are independent.
//                     const clearX = rx + this.ANCHOR_GAP_X_PCT;
//                     const clearY = ry + this.ANCHOR_GAP_Y_PCT;
//                     const nx = ex / clearX; // normalized ellipse-space x
//                     const ny = ey / clearY; // normalized ellipse-space y
//                     const normDist = Math.sqrt(nx * nx + ny * ny) || 1e-6;
//
//                     if (normDist < 1) {
//                         // Push out along the real (ex, ey) direction, scaled by
//                         // how deep inside the clearance ellipse we are.
//                         const dist = Math.sqrt(ex * ex + ey * ey) || 1e-6;
//                         const overlap = (1 - normDist) / normDist;
//                         fx += this.RECT_REPULSE * overlap * (ex / dist) * clearX;
//                         fy += this.RECT_REPULSE * overlap * (ey / dist) * clearY;
//                     }
//                 }
//
//                 // 4. Integrate velocity (Euler with damping)
//                 n.vx = (n.vx + fx) * this.DAMPING;
//                 n.vy = (n.vy + fy) * this.DAMPING;
//
//                 const prevX = n.x, prevY = n.y;
//                 n.x += n.vx;
//                 n.y += n.vy;
//
//                 // 5. Boundary clamp
//                 n.x = Math.max(rPct, Math.min(100 - rPct, n.x));
//                 n.y = Math.max(ry,   Math.min(100 - ry,   n.y));
//
//                 const disp = Math.sqrt((n.x - prevX) ** 2 + (n.y - prevY) ** 2);
//                 if (disp > maxDisp) maxDisp = disp;
//             }
//
//             // Early exit if converged
//             if (maxDisp < this.CONVERGE_THRESH) break;
//         }
//
//         // ── Build result map ──────────────────────────────────────────────────
//         for (const n of nodes) {
//             result.set(n.id, { x: n.x, y: n.y });
//         }
//         return result;
//     }
//
// }
export class ForceDirectedBalloonLayout {
    private containerWidth  = 1000;
    private containerHeight = 1400;

    // Tuning knobs
    private readonly MAX_ITER        = 300;
    private readonly DAMPING         = 0.6;   // velocity damping per tick
    private readonly SPRING_K        = 0.04;  // attraction to anchor
    private readonly BALLOON_REPULSE = 3.5;   // balloon–balloon repulsion strength
    private readonly RECT_REPULSE    = 2.5;   // balloon–rect repulsion strength
    private readonly ANCHOR_GAP_PCT  = 0.001;   // extra gap (%) between balloon edge and rect edge
    private readonly CONVERGE_THRESH = 0.002; // stop early if max displacement < this (%)

    setContainerSize(width: number, height: number) {
        this.containerWidth  = width;
        this.containerHeight = height;
    }

    /**
     * Compute collision-free balloon positions using force-directed layout.
     * @param annotations   All BalloonAnnotation objects (any page)
     * @param currentPage   Only annotations on this page are processed
     * @param balloonRadiusPct  Balloon radius in % of container height
     * @returns Map of annotation id → {x, y} in %
     */
    solve(
        annotations: Annotation[],
        currentPage: number,
        balloonRadiusPct: number
    ): Map<string, BalloonPosition> {
        const page = annotations.filter(a => a.pageIndex === currentPage);
        const result = new Map<string, BalloonPosition>();
        if (page.length === 0) return result;

        // Aspect ratio: needed to convert the single balloonRadiusPct (based on height)
        // into an X-axis equivalent radius for a roughly circular balloon on screen.
        const aspect = this.containerHeight / this.containerWidth; // typically ~1.4
        const rx = balloonRadiusPct * aspect; // radius in % along X axis
        const ry = balloonRadiusPct;          // radius in % along Y axis
        // For distance comparisons we use an average
        const rPct = (rx + ry) / 2;

        // ── Node state ────────────────────────────────────────────────────────
        type Node = {
            id: string;
            x: number; y: number;       // current position (% center of balloon)
            vx: number; vy: number;     // velocity
            ax: number; ay: number;     // anchor position (% center of balloon ideal start)
            rect: Rect;                 // annotation rect in %
        };

        const nodes: Node[] = page.map(ann => {
            // Compute anchor: preferred position is top-right corner of annotation rect,
            // offset by one balloon diameter away


            const anchorX = Math.min(99, ann.balloonX ?? (ann.rect.x + ann.rect.width + rPct * 2));
            const anchorY = Math.max(0,  ann.balloonY ?? (ann.rect.y));
            return {
                id: ann.id,
                x:  anchorX,
                y:  anchorY,
                vx: 0, vy: 0,
                ax: anchorX,
                ay: anchorY,
                rect: ann.rect,
            };
        });

        // ── Simulation loop ───────────────────────────────────────────────────
        for (let iter = 0; iter < this.MAX_ITER; iter++) {
            let maxDisp = 0;

            for (const n of nodes) {
                let fx = 0, fy = 0;

                // 1. Spring: attract to anchor
                const dx = n.ax - n.x;
                const dy = n.ay - n.y;
                fx += this.SPRING_K * dx;
                fy += this.SPRING_K * dy;

                // 2. Balloon–Balloon repulsion (circle–circle)
                for (const other of nodes) {
                    if (other.id === n.id) continue;
                    const ex = n.x - other.x;
                    const ey = n.y - other.y;
                    const dist = Math.sqrt(ex * ex + ey * ey) || 1e-6;
                    const minDist = rPct * 2 + 0.3; // two radii + tiny gap
                    if (dist < minDist) {
                        const overlap = (minDist - dist) / dist;
                        fx += this.BALLOON_REPULSE * overlap * ex;
                        fy += this.BALLOON_REPULSE * overlap * ey;
                    }
                }

                // 3. Balloon–Rect repulsion (push balloon outside ALL rects)
                // for (const ann of page) {
                //     // compute closest point on rect to balloon center
                //     const r = ann.rect;
                //     const closestX = Math.max(r.x, Math.min(n.x, r.x + r.width));
                //     const closestY = Math.max(r.y, Math.min(n.y, r.y + r.height));
                //     const ex = n.x - closestX;
                //     const ey = n.y - closestY;
                //     const dist = Math.sqrt(ex * ex + ey * ey) || 1e-6;
                //     const minClear = rPct + this.ANCHOR_GAP_PCT;
                //     if (dist < minClear) {
                //         const overlap = (minClear - dist) / dist;
                //         fx += this.RECT_REPULSE * overlap * ex;
                //         fy += this.RECT_REPULSE * overlap * ey;
                //     }
                // }
                // 3. Balloon–Rect repulsion (push balloon outside ALL rects)
                for (const ann of page) {
                    // Compute closest point on rect to balloon center
                    const r = ann.rect;
                    const closestX = Math.max(r.x, Math.min(n.x, r.x + r.width));
                    const closestY = Math.max(r.y, Math.min(n.y, r.y + r.height));

                    const ex = n.x - closestX;
                    const ey = n.y - closestY;

                    // Calculate required clearance along X and Y independently
                    const minClearX = rx + this.ANCHOR_GAP_PCT;
                    const minClearY = ry + this.ANCHOR_GAP_PCT;

                    // Check if the balloon center is overlapping the clearance box
                    const absX = Math.abs(ex);
                    const absY = Math.abs(ey);

                    if (absX < minClearX && absY < minClearY) {
                        // Calculate how deep it is overlapping on each axis
                        const overlapX = minClearX - absX;
                        const overlapY = minClearY - absY;

                        // Push along the shallower axis to cleanly exit the rectangle boundary
                        if (overlapX < overlapY) {
                            const signX = ex >= 0 ? 1 : -1;
                            fx += this.RECT_REPULSE * overlapX * signX;
                        } else {
                            const signY = ey >= 0 ? 1 : -1;
                            fy += this.RECT_REPULSE * overlapY * signY;
                        }
                    }
                }

                // 4. Integrate velocity (Euler with damping)
                n.vx = (n.vx + fx) * this.DAMPING;
                n.vy = (n.vy + fy) * this.DAMPING;

                const prevX = n.x, prevY = n.y;
                n.x += n.vx;
                n.y += n.vy;

                // 5. Boundary clamp
                n.x = Math.max(rPct, Math.min(100 - rPct, n.x));
                n.y = Math.max(ry,   Math.min(100 - ry,   n.y));

                const disp = Math.sqrt((n.x - prevX) ** 2 + (n.y - prevY) ** 2);
                if (disp > maxDisp) maxDisp = disp;
            }

            // Early exit if converged
            if (maxDisp < this.CONVERGE_THRESH) break;
        }

        // ── Build result map ──────────────────────────────────────────────────
        for (const n of nodes) {
            result.set(n.id, { x: n.x, y: n.y });
        }
        return result;
    }
}


export interface SpecialTool {
    id: string;
    name: string;
    description: string;
}

export interface Gauge {
    id: string;
    name: string;
    description: string;
}
export interface Machine {
    id: string;
    machineCategoryName: string;
    machineCategoryId: string;

    machineModelName: string;
    machineModelId: string;
}
export interface WidgetOptions {
    enableSpecialTools?: boolean;
    enableGauges?: boolean;
    enableMachines?: boolean;
}