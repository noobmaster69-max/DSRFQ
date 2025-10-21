import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
// add locales you need
import "flatpickr/dist/l10n/ar";
import "flatpickr/dist/l10n/bn";
import "flatpickr/dist/l10n/cs";
import "flatpickr/dist/l10n/de";
import "flatpickr/dist/l10n/es";
import "flatpickr/dist/l10n/fa";
import "flatpickr/dist/l10n/fr";
import "flatpickr/dist/l10n/hi";
import "flatpickr/dist/l10n/id";
import "flatpickr/dist/l10n/it";
import "flatpickr/dist/l10n/ko";
import "flatpickr/dist/l10n/nl";
import "flatpickr/dist/l10n/pl";
import "flatpickr/dist/l10n/pt";
import "flatpickr/dist/l10n/ro";
import "flatpickr/dist/l10n/ru";
import "flatpickr/dist/l10n/sv";
import "flatpickr/dist/l10n/tr";
import "flatpickr/dist/l10n/zh";
import "flatpickr/dist/l10n/zh-tw";

globalThis.flatpickr ??= flatpickr;

let culture = typeof document === "undefined" ? 'en' : (document.documentElement?.lang || 'en').toLowerCase();
if (flatpickr.l10ns[culture]) {
    flatpickr.localize(flatpickr.l10ns[culture]);
} else {
    culture = culture.split('-')[0];
    flatpickr.l10ns[culture] && flatpickr.localize(flatpickr.l10ns[culture]);
}