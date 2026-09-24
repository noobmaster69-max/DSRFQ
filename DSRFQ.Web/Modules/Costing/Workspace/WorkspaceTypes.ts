import {CostingPartDocumentsRow} from "@/ServerTypes/Costing/CostingPartDocumentsRow";
import {CostingPartStageTimingsRow} from "@/ServerTypes/Costing/CostingPartStageTimingsRow";

/** What the stage is currently rendering. */
export type StageMode = '2d' | '3d' | 'balloon';

/**
 * Which rendering of a 2D sheet to show.
 *
 * 'original' is the drawing exactly as uploaded; 'converted' is the sheet the
 * RFQ pipeline produced with the customer's title block and logo replaced.
 * Both are stored in CostingPartDocumentImages and told apart by its Original
 * column (1 and 0 respectively).
 */
export type SheetVariant = 'original' | 'converted';

/**
 * CostingPartDocuments.Type, as assigned at upload time by DrawingImportDialog.
 * Kept as named constants because the numbers appear in several places.
 */
export const DOC_TYPE_2D = 1;
export const DOC_TYPE_3D = 2;
export const DOC_TYPE_CAD = 3;

export const DOC_TYPE_LABEL: Record<number, { label: string; color: string }> = {
    [DOC_TYPE_2D]:  { label: '2D',  color: '#007bff' },
    [DOC_TYPE_3D]:  { label: '3D',  color: '#28a745' },
    [DOC_TYPE_CAD]: { label: 'CAD', color: '#6c757d' }
};

/** The modes a given document can be shown in, in the order they appear. */
export function modesForDocument(doc: CostingPartDocumentsRow): StageMode[] {
    switch (doc?.Type) {
        case DOC_TYPE_2D:  return ['2d', 'balloon'];
        case DOC_TYPE_3D:  return ['3d'];
        // A CAD file has neither page images nor a mesh the viewer can read.
        default:           return [];
    }
}

export const MODE_LABEL: Record<StageMode, string> = {
    '2d': '2D',
    '3d': '3D',
    'balloon': 'Balloon'
};

/**
 * Which pipeline a processing run belongs to.
 *
 * The three arrive on separate queues and are independent of one another, so
 * the timings panel gives each its own section rather than ranking their runs
 * against each other.
 */
export type TimingRunKind = 'conversion' | 'ballooning' | 'costing';

/** One pipeline's most recent run, as the timings panel renders it. */
export interface TimingRun {
    runId: string;
    kind: TimingRunKind;
    label: string;
    started?: string;
    steps: CostingPartStageTimingsRow[];
}

/** One status pill in the workspace header. */
export interface StatusChip {
    label: string;
    value: string;
    color: string;
}
