/**
 * The subset of DS_ERP StrategyWidget's ICONS map that Viewer3DWidget uses.
 *
 * Kept as a local module rather than imported from a larger widget so the 3D
 * viewer has no dependency outside its own folder.
 */
const ICONS: Record<string, string> = {
    fit: `<path d="M3 8V5a2 2 0 0 1 2-2h3"></path><path d="M16 3h3a2 2 0 0 1 2 2v3"></path><path d="M21 16v3a2 2 0 0 1-2 2h-3"></path><path d="M8 21H5a2 2 0 0 1-2-2v-3"></path>`,
    cube: `<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22v-10"></path>`,
    drawBox: `<rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M8 12h8"></path><path d="M12 8v8"></path>`,
    info: `<circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path>`,
    sun: `<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>`,
    moon: `<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"></path>`,
    eye: `<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"></path><circle cx="12" cy="12" r="3"></circle>`,
    eyeOff: `<path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a18 18 0 0 1-2.16 3.19"></path><path d="M6.61 6.61A18 18 0 0 0 2 12s3.5 7 10 7a9 9 0 0 0 5.39-1.61"></path><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path><line x1="2" y1="2" x2="22" y2="22"></line>`,
    scanEye: `<path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><circle cx="12" cy="12" r="3"></circle><path d="M12 16a9 9 0 0 0-6-5.66L12 12l6-1.66A9 9 0 0 0 12 16z"></path>`
};

export const getIcon = (name: string, classes: string = ""): string =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${classes}">${ICONS[name] || ''}</svg>`;
