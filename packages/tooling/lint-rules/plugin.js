import { definePlugin } from "vite-plus/lint/plugins";
import noCardTypeSniffing from "./rules/no-card-type-sniffing.js";
import noIdentityArithmetic from "./rules/no-identity-arithmetic.js";
import noIndexFallback from "./rules/no-index-fallback.js";
import noReactiveMutation from "./rules/no-reactive-mutation.js";

export default definePlugin({
  meta: { name: "flixlix" },
  rules: {
    "no-card-type-sniffing": noCardTypeSniffing,
    "no-identity-arithmetic": noIdentityArithmetic,
    "no-index-fallback": noIndexFallback,
    "no-reactive-mutation": noReactiveMutation,
  },
});
