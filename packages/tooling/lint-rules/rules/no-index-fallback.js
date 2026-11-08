import { defineRule } from "vite-plus/lint/plugins";

const INDEX_METHODS = new Set(["findIndex", "findLastIndex", "indexOf", "lastIndexOf"]);

const noIndexFallback = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow `||`/`??` fallbacks on index lookups, which return -1 on a miss.",
    },
    messages: {
      noIndexFallback:
        "`{{method}}` returns -1 when nothing matches, so this fallback never applies to a miss. Compare with -1 explicitly.",
    },
  },
  create(context) {
    return {
      LogicalExpression(node) {
        if (node.operator !== "||" && node.operator !== "??") {
          return;
        }
        const left = node.left;
        if (left.type !== "CallExpression" || left.callee.type !== "MemberExpression") {
          return;
        }
        const property = left.callee.property;
        if (property.type !== "Identifier" || !INDEX_METHODS.has(property.name)) {
          return;
        }
        context.report({ node, messageId: "noIndexFallback", data: { method: property.name } });
      },
    };
  },
});

export default noIndexFallback;
