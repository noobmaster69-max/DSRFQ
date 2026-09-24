/**
 * Recover when another Serenity app on the same host has replaced this app's
 * CSRF token.
 *
 * Serenity hard-codes the readable cookie "CSRF-TOKEN" on both sides (the
 * server's antiforgery filter writes it; corelib copies it into X-CSRF-TOKEN).
 * Cookies are scoped by host, not port, so opening DS_ERP on localhost:5000 or
 * ISA_EXP in the same browser overwrites DSRFQ's token with one from a
 * different key ring. Every DSRFQ service call then fails with an EMPTY 400
 * ("The key {...} was not found in the key ring" in the server log) until the
 * page is reloaded - which is what broke "This Page" (Rerun).
 *
 * The fix keeps nothing of its own: a failed call is followed by one GET that
 * makes the server issue a fresh token for the current user, and the call is
 * retried once with it. A first attempt that remembered the token in
 * sessionStorage could put back a token issued before login, which the server
 * rightly refuses; asking the server is the only source that is always right.
 */

function csrfCookie(): string | null {
    const m = document.cookie.match(/(?:^|; )CSRF-TOKEN=([^;]*)/);
    return m ? m[1] : null;     // raw, as corelib's getCookie sends it
}

if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    const originalFetch = window.fetch.bind(window);

    const isOwnServiceCall = (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        try {
            const u = new URL(url, location.href);
            return u.origin === location.origin && u.pathname.startsWith('/Services/');
        } catch {
            return false;
        }
    };

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const response = await originalFetch(input as any, init);
        if (response.status !== 400 || !isOwnServiceCall(input) || !init?.headers) return response;

        const headers = new Headers(init.headers);
        if (!headers.has('X-CSRF-TOKEN')) return response;
        // A real validation error carries a JSON body; an antiforgery refusal is empty.
        const body = await response.clone().text();
        if (body.trim()) return response;

        // Any page response re-issues CSRF-TOKEN for the signed-in user.
        await originalFetch('/', {credentials: 'same-origin', cache: 'no-store'});
        const fresh = csrfCookie();
        if (!fresh || fresh === headers.get('X-CSRF-TOKEN')) return response;

        headers.set('X-CSRF-TOKEN', fresh);
        return originalFetch(input as any, {...init, headers});
    };
}

export {};
