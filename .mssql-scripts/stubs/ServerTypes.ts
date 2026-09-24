/**
 * A fake of the generated Serenity services for the node unit tests.
 *
 * Every service records its calls in globalThis.__svc.calls and answers List
 * from globalThis.__svc.rows[<service>], so a test can hand the save/load code
 * a database state and read back exactly what it wrote. Row "classes" are only
 * types in the app, so here they are empty objects.
 */

interface Call { service: string; method: string; request: any; }
const svc: { calls: Call[]; rows: Record<string, any[]>; nextId: number } =
    (globalThis as any).__svc ??= { calls: [], rows: {}, nextId: 9000 };

function service(name: string) {
    const record = (method: string) => async (request: any, onSuccess?: (r: any) => void) => {
        svc.calls.push({ service: name, method, request });
        let response: any = {};
        if (method === 'List') response = { Entities: svc.rows[name] ?? [] };
        if (method === 'Create') response = { EntityId: svc.nextId++ };
        onSuccess?.(response);
        return response;
    };
    return {
        List: record('List'), Create: record('Create'), Update: record('Update'),
        Delete: record('Delete'), Retrieve: record('Retrieve'), RecognizeRegion: record('RecognizeRegion'),
    };
}

export const CostingPartBalloonsService = service('CostingPartBalloons');
export const CostingPartBalloonMaskZonesService = service('CostingPartBalloonMaskZones');
export const CostingPartBalloonAreasService = service('CostingPartBalloonAreas');
export const CostingPartBalloonGridsService = service('CostingPartBalloonGrids');

export const CostingPartBalloonsRow = {};
export const CostingPartBalloonMaskZonesRow = {};
export const CostingPartBalloonAreasRow = {};
export const CostingPartBalloonGridsRow = {};
