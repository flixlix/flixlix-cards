import { BROWSER } from "esm-env";

export const environment = BROWSER ? "browser-only code kept" : "browser-only code folded away";
