import { Authorization, Fluent } from "@serenity-is/corelib";
import { IdleTimeout } from "@serenity-is/pro.extensions";

Fluent.ready(() => {
    // let demo page use its own settings for idle timeout
    if (window.location.pathname.indexOf('Samples/IdleTimeout') > 0)
        return;

    var meta = Fluent(document.querySelector('meta[name=username]'));
    if ((meta.attr('content')) || (!meta.length && Authorization.isLoggedIn)) {
        new IdleTimeout({
            activityTimeout: 15 * 60,
            warningDuration: 2 * 60
        });
    }
});