import { defineRule } from "vite-plus/lint/plugins";

function isLiteralOne(node) {
  return node.type === "Literal" && node.value === 1;
}

const noIdentityArithmetic = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Disallow multiplying or dividing by the literal 1." },
    messages: {
      noIdentityArithmetic:
        "`{{operator}} 1` does nothing. If a factor like `(1 - x)` was intended, add the parentheses.",
    },
  },
  create(context) {
    return {
      BinaryExpression(node) {
        const multipliesByOne =
          node.operator === "*" && (isLiteralOne(node.left) || isLiteralOne(node.right));
        const dividesByOne = node.operator === "/" && isLiteralOne(node.right);
        if (multipliesByOne || dividesByOne) {
          context.report({
            node,
            messageId: "noIdentityArithmetic",
            data: { operator: node.operator },
          });
        }
      },
    };
  },
});

export default noIdentityArithmetic;
