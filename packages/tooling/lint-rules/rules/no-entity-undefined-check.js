import { defineRule } from "vite-plus/lint/plugins";

const isUndefined = (node) => node.type === "Identifier" && node.name === "undefined";

const unwrapped = (node) => (node.type === "ChainExpression" ? node.expression : node);

const isMember = (node) =>
  node.type === "MemberExpression" &&
  !node.computed &&
  node.property.type === "Identifier" &&
  node.property.name === "entity";

const isEntityAccess = (node) => isMember(unwrapped(node));

const noEntityUndefinedCheck = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow deciding whether a node is configured by comparing its `entity` to undefined.",
    },
    messages: {
      noEntityUndefinedCheck:
        'An empty entity (`""`, or split entities with both sides empty), as the visual editor leaves after clearing the field, is not undefined. Check for a real entity instead, e.g. `!!field?.entity`.',
    },
  },
  create(context) {
    return {
      BinaryExpression(node) {
        const comparesEquality = ["===", "!==", "==", "!="].includes(node.operator);
        const entityToUndefined =
          (isEntityAccess(node.left) && isUndefined(node.right)) ||
          (isUndefined(node.left) && isEntityAccess(node.right));
        if (comparesEquality && entityToUndefined) {
          context.report({ node, messageId: "noEntityUndefinedCheck" });
        }
      },
    };
  },
});

export default noEntityUndefinedCheck;
