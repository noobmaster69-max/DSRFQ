/**
 * A random v4 UUID that works whether or not the page is a "secure context".
 *
 * crypto.randomUUID() exists only on https:// pages and on localhost. Opened as
 * http://localhost:5001 everything worked; opened over Tailscale as
 * http://100.68.166.119:5001 the same browser has no randomUUID at all, and
 * adding a balloon, an area or a mask threw "crypto.randomUUID is not a
 * function" - the edit simply did not happen.
 *
 * crypto.getRandomValues() is NOT restricted that way, and is the same
 * cryptographic generator, so this builds the UUID from it by hand when
 * randomUUID is missing. The bits are set exactly as RFC 4122 section 4.4
 * requires, so the result is indistinguishable from randomUUID()'s.
 */
export function newId(): string {
    const c: Crypto | undefined = (globalThis as any).crypto;
    if (c && typeof c.randomUUID === 'function') return c.randomUUID();
    return uuidV4(c);
}

/** RFC 4122 v4 from getRandomValues; Math.random only if there is no crypto at all. */
export function uuidV4(c: Crypto | undefined = (globalThis as any).crypto): string {
    const b = new Uint8Array(16);
    if (c && typeof c.getRandomValues === 'function') c.getRandomValues(b);
    else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
    b[6] = (b[6] & 0x0f) | 0x40;    // version 4
    b[8] = (b[8] & 0x3f) | 0x80;    // variant 10xx
    const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
