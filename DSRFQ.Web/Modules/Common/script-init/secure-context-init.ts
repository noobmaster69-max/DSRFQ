/**
 * Browser features that only exist on a "secure context" - https://, or
 * localhost - filled in for when DSRFQ is opened by plain http:// on another
 * address, which is how it is reached over Tailscale (http://100.68.166.119:5001).
 *
 * Imported FIRST in script-init, which is the first module script in the page
 * head, so this runs before any page code or library that might call these.
 *
 * Only what can be filled in safely is: randomUUID is rebuilt from
 * getRandomValues, which is the same generator and is not restricted. Things
 * that cannot be emulated (crypto.subtle, the clipboard API, service workers)
 * are deliberately left missing so code that checks for them still sees the
 * truth - the real fix for those is to serve over https.
 */
import { uuidV4 } from "../Helpers/NewId";

const c: any = (globalThis as any).crypto;
if (c && typeof c.randomUUID !== "function" && typeof c.getRandomValues === "function") {
    try {
        Object.defineProperty(c, "randomUUID", {
            value: () => uuidV4(c),
            configurable: true,
            writable: true,
        });
    } catch {
        // A browser that will not let the property be added: the widget does
        // not depend on this - it calls newId() directly.
    }
}
