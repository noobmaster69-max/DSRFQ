import { gridDefaults } from "@serenity-is/sleekgrid";
import DOMPurify from "dompurify";

gridDefaults.useCssVars = true;
gridDefaults.sanitizer = (globalThis.DOMPurify = DOMPurify).sanitize;