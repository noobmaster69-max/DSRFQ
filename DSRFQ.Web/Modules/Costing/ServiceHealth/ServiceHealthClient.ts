import { serviceRequest, ServiceResponse } from '@serenity-is/corelib';

/**
 * Hand-written client for ServiceHealthEndpoint (sergen cannot run here).
 * The server probes every service every 10 s; this only reads the result.
 */

export type ServiceState = 'up' | 'slow' | 'down' | 'unknown';
export type StageState = 'ready' | 'degraded' | 'blocked' | 'unknown';
export type StageKey = 'drawing' | 'costing' | 'ballooning';

export interface HealthSample {
    At: string;
    State: ServiceState;
    Ms?: number;
}

export interface HealthService {
    Key: string;
    Name: string;
    Purpose: string;
    State: ServiceState;
    LatencyMs?: number;
    Detail?: string;
    CheckedAt?: string;
    LastUpAt?: string;
    RequiredBy: StageKey[];
    ImprovesStages: StageKey[];
    UptimePercent?: number;
    History?: HealthSample[];
}

export interface HealthStage {
    Stage: StageKey;
    State: StageState;
    Blocking: string[];
    Degrading: string[];
}

export interface HealthResponse extends ServiceResponse {
    Now: string;
    IntervalSeconds: number;
    Services: HealthService[];
    Stages: HealthStage[];
}

export function fetchServiceHealth(withoutHistory = false): Promise<HealthResponse> {
    return new Promise((resolve, reject) => {
        serviceRequest<HealthResponse>('Costing/ServiceHealth/Current', { WithoutHistory: withoutHistory } as any,
            response => resolve(response),
            {
                blockUI: false,
                // A status check that cannot reach the server must not put an
                // error modal over the page the operator is working in.
                onError: (e: any) => { reject(e); return true; }
            } as any);
    });
}

export const STAGE_LABELS: Record<StageKey, string> = {
    drawing: 'Drawing',
    costing: 'Costing',
    ballooning: 'Ballooning',
};

/** Status is shown as icon + word, never colour alone. */
export const STATE_TEXT: Record<ServiceState | StageState, { label: string; icon: string }> = {
    up: { label: 'Running', icon: '●' },
    slow: { label: 'Slow', icon: '▲' },
    down: { label: 'Not running', icon: '✕' },
    unknown: { label: 'Checking…', icon: '○' },
    ready: { label: 'Ready', icon: '✓' },
    degraded: { label: 'Runs, partly', icon: '▲' },
    blocked: { label: 'Service down', icon: '✕' },
};
