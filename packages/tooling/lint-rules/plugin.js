import { definePlugin } from "vite-plus/lint/plugins";
import noIdentityArithmetic from "./rules/no-identity-arithmetic.js";
import noIndexFallback from "./rules/no-index-fallback.js";
import noReactiveMutation from "./rules/no-reactive-mutation.js";

export default definePlugin({
  meta: { name: "flixlix" },
  rules: {
    "no-identity-arithmetic": noIdentityArithmetic,
    "no-index-fallback": noIndexFallback,
    "no-reactive-mutation": noReactiveMutation,
  },
});
