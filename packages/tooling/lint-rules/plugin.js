import { definePlugin } from "vite-plus/lint/plugins";
import cognitiveComplexity from "./rules/cognitive-complexity.js";
import noCamelcaseEventBinding from "./rules/no-camelcase-event-binding.js";
import noCardTypeSniffing from "./rules/no-card-type-sniffing.js";
import noIdentityArithmetic from "./rules/no-identity-arithmetic.js";
import noIndexFallback from "./rules/no-index-fallback.js";
import noMutation from "./rules/no-mutation.js";
import noMwcElements from "./rules/no-mwc-elements.js";
import noNativeDateInput from "./rules/no-native-date-input.js";
import noPacedKeyPoints from "./rules/no-paced-key-points.js";
import noReactiveMutation from "./rules/no-reactive-mutation.js";
import noUnsupportedRuntimeApis from "./rules/no-unsupported-runtime-apis.js";

export default definePlugin({
  meta: { name: "flixlix" },
  rules: {
    "cognitive-complexity": cognitiveComplexity,
    "no-camelcase-event-binding": noCamelcaseEventBinding,
    "no-card-type-sniffing": noCardTypeSniffing,
    "no-identity-arithmetic": noIdentityArithmetic,
    "no-index-fallback": noIndexFallback,
    "no-mutation": noMutation,
    "no-mwc-elements": noMwcElements,
    "no-native-date-input": noNativeDateInput,
    "no-paced-key-points": noPacedKeyPoints,
    "no-reactive-mutation": noReactiveMutation,
    "no-unsupported-runtime-apis": noUnsupportedRuntimeApis,
  },
});
