import { getjQuery } from "@serenity-is/corelib";

let $ = getjQuery();
if ($?.fn?.colorbox?.settings) {
    $.fn.colorbox.settings.maxWidth = "95%";
    $.fn.colorbox.settings.maxHeight = "95%";
}
