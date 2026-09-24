/**
 * How a balloon looks - One Supply's per-bubble right-click menu (colour,
 * shape, size, line width, style) and its shop-wide Bubble Settings dialog.
 *
 * Every per-balloon field is optional and null means "the shop default", so a
 * balloon nobody restyled follows a later change to the default instead of
 * keeping whatever the default was the day it was drawn.
 */

import { getSetting, setSetting } from "./BallooningSettingsStore";

export type BalloonShape = 'circle' | 'solid' | 'star' | 'triangle';
export type BalloonStylePreset = 'default' | 'warning' | 'error' | 'success';

export const SHAPES: { key: BalloonShape; label: string }[] = [
    { key: 'circle', label: 'Hollow circle' },
    { key: 'solid', label: 'Solid circle' },
    { key: 'star', label: 'Star' },
    { key: 'triangle', label: 'Triangle' },
];

export const STYLE_PRESETS: { key: BalloonStylePreset; label: string; color: string | null }[] = [
    { key: 'default', label: 'Default', color: null },
    { key: 'warning', label: 'Warning', color: '#d97706' },
    { key: 'error', label: 'Error', color: '#dc2626' },
    { key: 'success', label: 'Success', color: '#16a34a' },
];

/** One Supply's Small / Medium / Large / Extra large, as a multiplier. */
export const SIZE_PRESETS: { key: string; label: string; scale: number | null }[] = [
    { key: 'small', label: 'Small', scale: 0.75 },
    { key: 'medium', label: 'Medium', scale: 1 },
    { key: 'large', label: 'Large', scale: 1.35 },
    { key: 'xlarge', label: 'Extra large', scale: 1.7 },
    { key: 'auto', label: 'Auto (follow the drawing)', scale: null },
];

/** The shop's defaults. */
export interface BubbleStyle {
    shape: BalloonShape;
    borderColor: string;
    textColor: string;
    /** 1-5, One Supply's line width levels. */
    lineWidth: number;
    showArrow: boolean;
}

export const DEFAULT_BUBBLE_STYLE: BubbleStyle = {
    shape: 'circle',
    borderColor: '#2778b9',
    textColor: '#2778b9',
    lineWidth: 2,
    showArrow: false,
};

/**
 * A datum feature, when it has no colour of its own.
 *
 * A datum is not a measured characteristic - it is the surface every other
 * characteristic is measured FROM - so on a sheet of 170 balloons it should be
 * findable without reading the tiny triangle in each one's text. Magenta
 * because every other meaning is taken: blue is an ordinary balloon, orange a
 * selected one, and amber/red/green are the Warning/Error/Success presets.
 */
export const DATUM_COLOR = '#c026d3';

/** What a balloon carries of its own. All optional. */
export interface BalloonStyleFields {
    balloonColor?: string;
    textColor?: string;
    balloonShape?: BalloonShape;
    balloonLineWidth?: number;
    balloonStyle?: BalloonStylePreset;
    showArrow?: boolean;
    balloonScale?: number;
    /** Colours the balloon as a datum, unless it carries a colour or a preset. */
    isDatum?: boolean;
}

export interface ResolvedStyle {
    shape: BalloonShape;
    stroke: string;
    fill: string;
    fillOpacity: number;
    text: string;
    /** Stroke width in the 0-100 balloon viewBox. */
    strokeWidth: number;
    /** The same level as a PDF line thickness, in points. */
    pdfLineWidth: number;
    arrow: boolean;
    /** Size multiplier on top of the drawing-wide size. */
    scale: number;
}

const SELECTED = '#ff8c00';
const HEX = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i;
const clampLevel = (v: any, fallback: number) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.max(1, Math.min(5, n)) : fallback;
};

export function resolveBalloonStyle(
    a: BalloonStyleFields, shop: BubbleStyle = DEFAULT_BUBBLE_STYLE, selected = false
): ResolvedStyle {
    const preset = STYLE_PRESETS.find(p => p.key === a.balloonStyle)?.color ?? null;
    const shape: BalloonShape = SHAPES.some(s => s.key === a.balloonShape) ? a.balloonShape! : shop.shape;
    // Precedence: a colour the operator set, then a style preset, then the
    // datum colour, then the shop default. The datum colour sits BELOW both of
    // the first two on purpose - it is a better default than the shop's blue,
    // not an override of a choice somebody made on this balloon.
    const fallback = a.isDatum ? DATUM_COLOR : null;
    let stroke = (a.balloonColor && HEX.test(a.balloonColor))
        ? a.balloonColor : (preset ?? fallback ?? shop.borderColor);
    let text = (a.textColor && HEX.test(a.textColor))
        ? a.textColor : (preset ?? fallback ?? shop.textColor);
    if (selected) { stroke = SELECTED; text = SELECTED; }

    const level = clampLevel(a.balloonLineWidth, clampLevel(shop.lineWidth, 2));
    const solid = shape === 'solid';
    return {
        shape,
        stroke,
        fill: solid ? stroke : '#ffffff',
        fillOpacity: solid ? 1 : 0.85,
        text: solid ? '#ffffff' : text,
        strokeWidth: 1 + level * 2,
        pdfLineWidth: 0.5 + level * 0.5,
        arrow: a.showArrow ?? shop.showArrow,
        scale: Number(a.balloonScale) > 0 ? Number(a.balloonScale) : 1,
    };
}

/** Star points in a 0-100 box: ten vertices, alternating radii. */
function starPoints(): string {
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 22 : 48;
        const t = -Math.PI / 2 + (i * Math.PI) / 5;
        pts.push(`${(50 + r * Math.cos(t)).toFixed(1)},${(52 + r * Math.sin(t)).toFixed(1)}`);
    }
    return pts.join(' ');
}
const STAR = starPoints();

/** The outline, in a 0-100 viewBox. */
export function shapeSvg(s: ResolvedStyle): string {
    const paint = `fill="${s.fill}" fill-opacity="${s.fillOpacity}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" stroke-linejoin="round"`;
    switch (s.shape) {
        case 'triangle': return `<polygon points="50,5 96,90 4,90" ${paint}/>`;
        case 'star': return `<polygon points="${STAR}" ${paint}/>`;
        default: return `<circle cx="50" cy="50" r="45" ${paint}/>`;
    }
}

/** Where the number sits vertically - a triangle's centre of mass is low. */
export function textAnchorY(shape: BalloonShape): number {
    return shape === 'triangle' ? 62 : shape === 'star' ? 55 : 50;
}

/** A smaller number fits a triangle or star. */
export function textScale(shape: BalloonShape): number {
    return shape === 'triangle' || shape === 'star' ? 0.7 : 1;
}

export function loadBubbleStyle(): BubbleStyle {
    try {
        const raw = getSetting('bubbleStyle');
        if (!raw) return { ...DEFAULT_BUBBLE_STYLE };
        const s = JSON.parse(raw);
        return {
            shape: SHAPES.some(x => x.key === s?.shape) ? s.shape : DEFAULT_BUBBLE_STYLE.shape,
            borderColor: HEX.test(s?.borderColor) ? s.borderColor : DEFAULT_BUBBLE_STYLE.borderColor,
            textColor: HEX.test(s?.textColor) ? s.textColor : DEFAULT_BUBBLE_STYLE.textColor,
            lineWidth: clampLevel(s?.lineWidth, DEFAULT_BUBBLE_STYLE.lineWidth),
            showArrow: !!s?.showArrow,
        };
    } catch {
        return { ...DEFAULT_BUBBLE_STYLE };
    }
}

export function saveBubbleStyle(style: BubbleStyle): void {
    setSetting('bubbleStyle', JSON.stringify(style));
}
