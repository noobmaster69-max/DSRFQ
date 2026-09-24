// First: fills in crypto.randomUUID for http:// on a non-localhost address
// (Tailscale), before anything below or any page code can need it.
import "./secure-context-init";
import "./csrf-guard-init";
import "./colorbox-init";
import "./errorhandling-init";
import "./flatpickr-init";
import "./idletimeout-init";
import "./languages-init";
import "./namespaces-init";
import "./sleekgrid-init";