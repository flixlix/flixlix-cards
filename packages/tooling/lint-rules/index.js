import { definePlugin, defineRule } from "vite-plus/lint/plugins";

const INDEX_METHODS = new Set(["findIndex", "findLastIndex", "indexOf", "lastIndexOf"]);

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

const REACTIVE_DECORATORS = new Set(["state", "property"]);

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

function decoratorName(decorator) {
  const expression = decorator.expression;
  if (expression.type === "CallExpression" && expression.callee.type === "Identifier") {
    return expression.callee.name;
  }
  return expression.type === "Identifier" ? expression.name : undefined;
}

function reactiveFieldNames(classBody) {
  const names = new Set();
  for (const member of classBody.body) {
    const isReactive = (member.decorators ?? []).some((decorator) =>
      REACTIVE_DECORATORS.has(decoratorName(decorator))
    );
    if (isReactive && member.key?.type === "Identifier") {
      names.add(member.key.name);
    }
  }
  return names;
}

/** `this.field` at the root of a member chain, or undefined. */
function thisFieldAccess(node) {
  let current = node;
  while (current.type === "MemberExpression" && current.object.type === "MemberExpression") {
    current = current.object;
  }
  if (
    current.type === "MemberExpression" &&
    current.object.type === "ThisExpression" &&
    !current.computed &&
    current.property.type === "Identifier"
  ) {
    return current;
  }
  return undefined;
}

const noReactiveMutation = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow in-place mutation of Lit `@state`/`@property` fields; Lit only re-renders on reassignment.",
    },
    messages: {
      noReactiveMutation:
        "`this.{{field}}` is reactive, but mutating it in place does not trigger a re-render. Assign a new value instead.",
    },
  },
  create(context) {
    const scopes = [];
    const isReactive = (name) => scopes.length > 0 && scopes[scopes.length - 1].has(name);

    function reportIfNestedMutation(target) {
      if (target.type !== "MemberExpression") {
        return;
      }
      const root = thisFieldAccess(target);
      if (root && root !== target && isReactive(root.property.name)) {
        context.report({
          node: target,
          messageId: "noReactiveMutation",
          data: { field: root.property.name },
        });
      }
    }

    return {
      ClassBody(node) {
        scopes.push(reactiveFieldNames(node));
      },
      "ClassBody:exit"() {
        scopes.pop();
      },
      AssignmentExpression(node) {
        reportIfNestedMutation(node.left);
      },
      UpdateExpression(node) {
        reportIfNestedMutation(node.argument);
      },
      UnaryExpression(node) {
        if (node.operator === "delete") {
          reportIfNestedMutation(node.argument);
        }
      },
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "MemberExpression" || callee.property.type !== "Identifier") {
          return;
        }
        if (!MUTATING_METHODS.has(callee.property.name)) {
          return;
        }
        const root = thisFieldAccess(callee.object);
        if (root && isReactive(root.property.name)) {
          context.report({
            node,
            messageId: "noReactiveMutation",
            data: { field: root.property.name },
          });
        }
      },
    };
  },
});

export default definePlugin({
  meta: { name: "flixlix" },
  rules: {
    "no-index-fallback": noIndexFallback,
    "no-identity-arithmetic": noIdentityArithmetic,
    "no-reactive-mutation": noReactiveMutation,
  },
});
