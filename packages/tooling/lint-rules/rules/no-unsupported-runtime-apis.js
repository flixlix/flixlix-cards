import { defineRule } from "vite-plus/lint/plugins";

// Newer than the cards' browser targets (Chrome 67, Safari 15 — see packages/tooling/bundler)
// and not polyfilled by Home Assistant's legacy frontend build.
const UNSUPPORTED_METHODS = new Map([
  ["at", "Array/String.prototype.at (Chrome 92)"],
  ["findLast", "Array.prototype.findLast (Chrome 97)"],
  ["findLastIndex", "Array.prototype.findLastIndex (Chrome 97)"],
  ["replaceAll", "String.prototype.replaceAll (Chrome 85)"],
  ["toSorted", "Array.prototype.toSorted (Chrome 110)"],
  ["toReversed", "Array.prototype.toReversed (Chrome 110)"],
  ["toSpliced", "Array.prototype.toSpliced (Chrome 110)"],
]);
const UNSUPPORTED_STATICS = new Map([
  ["Object.hasOwn", "Object.hasOwn (Chrome 93)"],
  ["Object.groupBy", "Object.groupBy (Chrome 117)"],
  ["Array.fromAsync", "Array.fromAsync (Chrome 121)"],
]);
const UNSUPPORTED_GLOBALS = new Map([["structuredClone", "structuredClone (Chrome 98)"]]);

const noUnsupportedRuntimeApis = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow runtime APIs newer than the cards' browser targets; Babel only transpiles syntax, so these throw on older browsers and the card renders blank.",
    },
    messages: {
      unsupported:
        "{{api}} is newer than the cards' browser targets and isn't polyfilled, so the card breaks on older browsers (Cast, Fire tablets). Use an older equivalent.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type === "Identifier" && UNSUPPORTED_GLOBALS.has(callee.name)) {
          context.report({
            node,
            messageId: "unsupported",
            data: { api: UNSUPPORTED_GLOBALS.get(callee.name) },
          });
          return;
        }
        if (
          callee.type !== "MemberExpression" ||
          callee.computed ||
          callee.property.type !== "Identifier"
        ) {
          return;
        }
        const method = callee.property.name;
        if (callee.object.type === "Identifier") {
          const api = UNSUPPORTED_STATICS.get(`${callee.object.name}.${method}`);
          if (api) {
            context.report({ node, messageId: "unsupported", data: { api } });
            return;
          }
        }
        const api = UNSUPPORTED_METHODS.get(method);
        if (api) {
          context.report({ node, messageId: "unsupported", data: { api } });
        }
      },
    };
  },
});

export default noUnsupportedRuntimeApis;
