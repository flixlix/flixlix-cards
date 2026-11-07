import { defineRule } from "vite-plus/lint/plugins";

const MUTATING_METHODS = new Set([
  "push",
  "pop",
  "shift",
  "unshift",
  "splice",
  "sort",
  "reverse",
  "fill",
  "copyWithin",
  "set",
  "add",
  "delete",
  "clear",
]);

const calledMethod = (callee) => {
  if (callee.type !== "MemberExpression") {
    return undefined;
  }
  if (!callee.computed && callee.property.type === "Identifier") {
    return callee.property.name;
  }
  return callee.property.type === "Literal" ? String(callee.property.value) : undefined;
};

const noMutation = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow reassignment and in-place mutation; build new values from const bindings instead.",
    },
    messages: {
      binding: "Use `const`; `{{kind}}` bindings can be reassigned.",
      assignment: "Do not assign to an existing binding or property; derive a new const value.",
      update: "Do not use `{{operator}}`; derive a new const value.",
      delete: "Do not `delete` properties; build an object without them.",
      method: "`.{{method}}()` mutates its receiver; build a new value instead.",
    },
  },
  create(context) {
    return {
      VariableDeclaration(node) {
        if (node.kind === "let" || node.kind === "var") {
          context.report({ node, messageId: "binding", data: { kind: node.kind } });
        }
      },
      AssignmentExpression(node) {
        context.report({ node, messageId: "assignment" });
      },
      UpdateExpression(node) {
        context.report({ node, messageId: "update", data: { operator: node.operator } });
      },
      UnaryExpression(node) {
        if (node.operator === "delete") {
          context.report({ node, messageId: "delete" });
        }
      },
      CallExpression(node) {
        const method = calledMethod(node.callee);
        if (method !== undefined && MUTATING_METHODS.has(method)) {
          context.report({ node, messageId: "method", data: { method } });
        }
      },
    };
  },
});

export default noMutation;
