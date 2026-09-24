import {CostingPartDocumentsRow} from "@/ServerTypes/Costing/CostingPartDocumentsRow";
import {CostingPartDocumentsService} from "@/ServerTypes/Costing/CostingPartDocumentsService";
import {Viewer3DWidget} from "@/Common/Widgets/Viewer3D/Viewer3DWidget";

/**
 * Caching for browser-converted 3D models.
 *
 * STEP and IGES are read by an occt WASM importer that online-3d-viewer fetches
 * from cdn.jsdelivr.net at runtime (the URL is hard-coded in the package, so it
 * cannot be self-hosted). That is slow and needs internet, so we pay it once:
 * the first open re-exports the tessellated model as binary glTF and stores it,
 * and every later open loads the glb instead.
 *
 * DS_ERP does this with a separate Type 3 ProjectDocuments row stamped with the
 * source filename. Here the glb goes in `ConvertedFileDirectory` on the same row
 * as its source, because that column already exists and already means exactly
 * this. Source and cache cannot drift apart, so no stamping is needed.
 */

/** Formats whose importer pulls the external wasm. Mesh formats load natively. */
export function needsOcct(fileName: string): boolean {
    return /\.(stp|step|igs|iges|brp|brep|fcstd)$/i.test(fileName ?? '');
}

/** True when this document already has a usable converted model. */
export function hasCachedGlb(doc: CostingPartDocumentsRow): boolean {
    return !!doc?.ConvertedFileDirectory && /\.glb$/i.test(doc.ConvertedFileDirectory);
}

/**
 * The upload path the viewer should load for a 3D document: the cached glb when
 * there is one, otherwise the original file.
 */
export function resolve3DSource(doc: CostingPartDocumentsRow): string | null {
    if (!doc) return null;
    if (hasCachedGlb(doc)) return `/upload/${doc.ConvertedFileDirectory}`;
    if (doc.FileDirectory) return `/upload/${doc.FileDirectory}`;
    return null;
}

async function uploadTemporary(file: Blob, fileName: string): Promise<string | null> {
    const formData = new FormData();
    formData.append('file', file, fileName);
    const response = await fetch('/File/TemporaryUploadCK', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: formData
    });
    if (!response.ok) {
        console.error('glb upload failed', await response.text());
        return null;
    }
    const result = await response.json();
    // { uploaded: 1, fileName, url } on success, { uploaded: 0, error } on failure.
    if (!result?.uploaded) {
        console.error('glb upload rejected', result?.error?.message);
        return null;
    }
    return result.fileName ?? null;
}

/**
 * Waits for the viewer to finish importing, then exports a glb and writes it to
 * the document's ConvertedFileDirectory.
 *
 * Best-effort throughout: if any step fails the model itself is already on
 * screen, and the only cost is that the next open converts again. Gives up
 * after two minutes so a model that never loads does not poll forever.
 */
export function cacheGlbWhenReady(widget: Viewer3DWidget, doc: CostingPartDocumentsRow): void {
    if (!doc?.Id || !doc.FileDirectory) return;

    let waited = 0;
    const tick = async () => {
        if (!widget.hasModel()) {
            waited += 500;
            if (waited > 120000) return;
            setTimeout(tick, 500);
            return;
        }
        try {
            const glb = await widget.exportGlb();
            if (!glb) return;

            const base = (doc.FileName || doc.FileDirectory)
                .split(/[\\/]/).pop()!
                .replace(/\.[^.]+$/, '') || 'model';

            const uploaded = await uploadTemporary(glb, `${base}.glb`);
            if (!uploaded) return;

            await CostingPartDocumentsService.Update({
                EntityId: doc.Id,
                Entity: { ConvertedFileDirectory: uploaded }
            });
            doc.ConvertedFileDirectory = uploaded;
        } catch (e) {
            console.error('Could not cache a converted 3D model', e);
        }
    };
    setTimeout(tick, 500);
}
