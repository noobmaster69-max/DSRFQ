import { ErrorHandling } from "@serenity-is/corelib";

window.onerror = ErrorHandling.runtimeErrorHandler;
window.addEventListener("unhandledrejection", ErrorHandling.unhandledRejectionHandler);