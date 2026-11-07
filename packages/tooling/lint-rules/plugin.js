import { definePlugin } from "vite-plus/lint/plugins";
import cognitiveComplexity from "./rules/cognitive-complexity.js";
import noCardTypeSniffing from "./rules/no-card-type-sniffing.js";
import noIdentityArithmetic from "./rules/no-identity-arithmetic.js";
import noIndexFallback from "./rules/no-index-fallback.js";
import noMutation from "./rules/no-mutation.js";
import noReactiveMutation from "./rules/no-reactive-mutation.js";

export default definePlugin({
  meta: { name: "flixlix" },
  rules: {
    "cognitive-complexity": cognitiveComplexity,
    "no-card-type-sniffing": noCardTypeSniffing,
    "no-identity-arithmetic": noIdentityArithmetic,
    "no-index-fallback": noIndexFallback,
    "no-mutation": noMutation,
    "no-reactive-mutation": noReactiveMutation,
  },
});
