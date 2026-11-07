import { defineRule } from "vite-plus/lint/plugins";

const STRING_CHECKS = new Set(["includes", "startsWith", "endsWith"]);
const EQUALITY = new Set(["===", "!==", "==", "!="]);

function isConfigObject(node) {
  const name =
    node.type === "Identifier"
      ? node.name
      : node.type === "MemberExpression" && !node.computed && node.property.type === "Identifier"
        ? node.property.name
        : undefined;
  return name !== undefined && /config$/i.test(name);
}

/** `config.type`, `this._config.type`, `config?.type`. */
function isConfigType(node) {
  return (
    node?.type === "MemberExpression" &&
    !node.computed &&
    node.property.type === "Identifier" &&
    node.property.name === "type" &&
    isConfigObject(node.object)
  );
}

const isString = (node) =>
  (node.type === "Literal" && typeof node.value === "string") || node.type === "TemplateLiteral";

export default defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow branching on the card type string; take the unit family from the readings instead.",
    },
    messages: {
      noCardTypeSniffing:
        "Don't branch on `{{source}}.type`: the card type is a Lovelace detail. Pass what differs (e.g. the readings' unit family) as data.",
    },
  },
  create(context) {
    const report = (node, member) =>
      context.report({
        node,
        messageId: "noCardTypeSniffing",
        data: { source: context.sourceCode.getText(member.object) },
      });
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type === "MemberExpression" &&
          callee.property.type === "Identifier" &&
          STRING_CHECKS.has(callee.property.name) &&
          isConfigType(callee.object)
        ) {
          report(node, callee.object);
        }
      },
      BinaryExpression(node) {
        if (!EQUALITY.has(node.operator)) {
          return;
        }
        if (isConfigType(node.left) && isString(node.right)) {
          report(node, node.left);
        } else if (isConfigType(node.right) && isString(node.left)) {
          report(node, node.right);
        }
      },
    };
  },
});
